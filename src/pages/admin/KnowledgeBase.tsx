import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, RefreshCw, BookOpen, Sparkles, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Doc = {
  id: string;
  title: string;
  category: string;
  status: string;
  source: string;
  source_url: string | null;
  language: string;
  summary: string | null;
  updated_at: string;
};

const CATS = ["medicamentos", "guia_clinica", "estudio", "nutricion", "receta", "general"];
const STATUSES = ["draft", "review", "published", "archived"];

export default function KnowledgeBase() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Doc | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("knowledge_documents").select("*").order("updated_at", { ascending: false }).limit(200);
    if (catFilter !== "all") query = query.eq("category", catFilter);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    else setDocs((data ?? []) as Doc[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [catFilter, statusFilter]);

  const reindex = async (id: string) => {
    setBusy(id);
    try {
      const { data, error } = await supabase.functions.invoke("knowledge-embed", { body: { document_id: id } });
      if (error) throw error;
      toast.success(`Reindexado: ${data?.chunks ?? 0} chunks`);
    } catch (e: any) {
      toast.error("Reindex fallido", { description: e?.message });
    } finally {
      setBusy(null);
    }
  };

  const translate = async (id: string) => {
    setBusy(id);
    try {
      const { error } = await supabase.functions.invoke("knowledge-translate", { body: { document_id: id } });
      if (error) throw error;
      toast.success("Traducido");
      await load();
    } catch (e: any) {
      toast.error("Traducción falló", { description: e?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Base de conocimiento</h1>
          <p className="text-sm text-muted-foreground">Curación de fuentes clínicas para respuestas de IA con referencias.</p>
        </div>
        <DocDialog onSaved={load} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 pt-4 md:flex-row">
          <Input placeholder="Buscar por título" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} className="md:max-w-sm" />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}><RefreshCw className="mr-1 h-4 w-4" />Actualizar</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {docs.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{d.title}</CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge variant="outline">{d.category}</Badge>
                      <Badge variant={d.status === "published" ? "default" : "secondary"}>{d.status}</Badge>
                      <Badge variant="outline">{d.language}</Badge>
                      <span className="text-muted-foreground">{d.source}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => reindex(d.id)} disabled={busy === d.id}>
                      <Sparkles className="mr-1 h-3.5 w-3.5" />Reindexar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => translate(d.id)} disabled={busy === d.id}>
                      <Languages className="mr-1 h-3.5 w-3.5" />Traducir
                    </Button>
                    <Button size="sm" onClick={() => setEditing(d)}>Editar</Button>
                  </div>
                </div>
              </CardHeader>
              {d.summary && <CardContent className="pt-0 text-sm text-muted-foreground">{d.summary}</CardContent>}
            </Card>
          ))}
          {docs.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Sin documentos.</p>}
        </div>
      )}

      {editing && <EditDialog doc={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

function DocDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [source, setSource] = useState("Manual");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!title.trim() || !body.trim()) return toast.error("Título y cuerpo requeridos");
    setBusy(true);
    try {
      const { data, error } = await supabase.from("knowledge_documents").insert({
        title, category, source, source_url: url || null, body_md: body, status: "draft",
      }).select("id").single();
      if (error) throw error;
      await supabase.functions.invoke("knowledge-embed", { body: { document_id: data.id } });
      toast.success("Creado e indexado");
      setOpen(false); setTitle(""); setBody(""); setUrl("");
      onSaved();
    } catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Nuevo</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nuevo documento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Fuente" value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
          <Input placeholder="URL de la fuente (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Textarea placeholder="Cuerpo (Markdown)" value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Guardar e indexar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ doc, onClose, onSaved }: { doc: Doc; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Doc>(doc);
  const [body, setBody] = useState<string>("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("knowledge_documents").select("body_md").eq("id", doc.id).maybeSingle();
      setBody((data as any)?.body_md ?? "");
    })();
  }, [doc.id]);
  const save = async (reindex = false) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("knowledge_documents").update({
        title: d.title, category: d.category, status: d.status, source: d.source, source_url: d.source_url, summary: d.summary, body_md: body,
      }).eq("id", d.id);
      if (error) throw error;
      if (reindex) await supabase.functions.invoke("knowledge-embed", { body: { document_id: d.id } });
      toast.success(reindex ? "Guardado y reindexado" : "Guardado");
      onSaved(); onClose();
    } catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Editar documento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
          <div className="flex gap-2">
            <Select value={d.category} onValueChange={(v) => setD({ ...d, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={d.status} onValueChange={(v) => setD({ ...d, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input placeholder="Fuente" value={d.source} onChange={(e) => setD({ ...d, source: e.target.value })} />
          <Input placeholder="URL" value={d.source_url ?? ""} onChange={(e) => setD({ ...d, source_url: e.target.value })} />
          <Textarea placeholder="Resumen" value={d.summary ?? ""} onChange={(e) => setD({ ...d, summary: e.target.value })} rows={2} />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => save(false)} disabled={busy}>Guardar</Button>
            <Button onClick={() => save(true)} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              Guardar y reindexar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}