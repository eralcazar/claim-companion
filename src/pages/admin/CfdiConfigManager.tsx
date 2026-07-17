import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, ShieldCheck, FlaskConical, Wrench } from "lucide-react";
import { useCfdiConfigs, useUpsertCfdiConfig } from "@/hooks/useCfdi";
import { CfdiModeBadge } from "@/components/facturacion/CfdiModeBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CfdiConfigManager() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin" as any);
  const { data: configs = [] } = useCfdiConfigs();
  const upsert = useUpsertCfdiConfig();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="container py-6 max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Facturación electrónica</h1>
          <p className="text-sm text-muted-foreground">Configura los emisores CFDI (farmacia Yael Médica y profesionales de la salud).</p>
        </div>
        <div className="flex items-center gap-2">
          <CfdiModeBadge />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Nuevo emisor</Button></DialogTrigger>
            <ConfigForm initial={editing} onSubmit={async (p) => { await upsert.mutateAsync(p); setOpen(false); setEditing(null); }} />
          </Dialog>
        </div>
      </div>

      <div className="grid gap-3">
        {configs.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
            Sin emisores. Agrega la farmacia y cada profesional que emitirá CFDI.
          </CardContent></Card>
        )}
        {configs.map((c: any) => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {c.razon_social}
                    <Badge variant="outline">{c.emisor_type}</Badge>
                    <ModeBadge modo={c.modo} />
                  </CardTitle>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">RFC {c.rfc} · CP {c.codigo_postal} · Serie {c.serie || "A"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={c.activo} onCheckedChange={(v) => upsert.mutate({ id: c.id, activo: v })} />
                  <Button size="sm" variant="outline" onClick={() => { setEditing(c); setOpen(true); }}>Editar</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Modo</span>
                <Select value={c.modo} onValueChange={(modo) => upsert.mutate({ id: c.id, modo })}>
                  <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (pruebas)</SelectItem>
                    <SelectItem value="produccion">Producción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CsdUpload cfg={c} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ModeBadge({ modo }: { modo: string }) {
  if (modo === "produccion") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30" variant="outline"><ShieldCheck className="h-3 w-3 mr-1" />Producción</Badge>;
  if (modo === "sandbox") return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30" variant="outline"><FlaskConical className="h-3 w-3 mr-1" />Sandbox</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30" variant="outline"><Wrench className="h-3 w-3 mr-1" />Simulado</Badge>;
}

function ConfigForm({ initial, onSubmit }: { initial: any | null; onSubmit: (p: any) => Promise<void> }) {
  const { user } = useAuth();
  const [f, setF] = useState<any>(() => initial ?? {
    owner_id: user!.id, emisor_type: "profesional", rfc: "", razon_social: "",
    regimen_fiscal: "612", codigo_postal: "", modo: "sandbox", pac: "sw_sapien", serie: "A", activo: true,
  });
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{initial ? "Editar emisor CFDI" : "Nuevo emisor CFDI"}</DialogTitle></DialogHeader>
      <div className="grid gap-3 max-h-[70vh] overflow-y-auto">
        <div><Label>Tipo de emisor</Label>
          <Select value={f.emisor_type} onValueChange={(v) => setF({ ...f, emisor_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="farmacia">Farmacia (Yael Médica)</SelectItem>
              <SelectItem value="profesional">Profesional de la salud</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Owner user id</Label><Input value={f.owner_id} onChange={(e) => setF({ ...f, owner_id: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>RFC</Label><Input value={f.rfc} onChange={(e) => setF({ ...f, rfc: e.target.value.toUpperCase() })} /></div>
          <div><Label>CP</Label><Input value={f.codigo_postal} onChange={(e) => setF({ ...f, codigo_postal: e.target.value })} /></div>
        </div>
        <div><Label>Razón social</Label><Input value={f.razon_social} onChange={(e) => setF({ ...f, razon_social: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Régimen fiscal</Label><Input value={f.regimen_fiscal} onChange={(e) => setF({ ...f, regimen_fiscal: e.target.value })} placeholder="612 = PF Actividad empresarial" /></div>
          <div><Label>Serie</Label><Input value={f.serie} onChange={(e) => setF({ ...f, serie: e.target.value })} /></div>
        </div>
        <div><Label>Modo</Label>
          <Select value={f.modo} onValueChange={(v) => setF({ ...f, modo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox (pruebas SW Sapien)</SelectItem>
              <SelectItem value="produccion">Producción</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={!f.rfc || !f.razon_social || !f.codigo_postal} onClick={() => onSubmit(f)}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CsdUpload({ cfg }: { cfg: any }) {
  const upsert = useUpsertCfdiConfig();
  const [pwd, setPwd] = useState(cfg.csd_password || "");
  const [uploading, setUploading] = useState(false);
  async function upload(kind: "cer" | "key", file: File) {
    setUploading(true);
    const path = `${cfg.id}/${kind === "cer" ? "cert.cer" : "priv.key"}`;
    const { error } = await supabase.storage.from("cfdi-csd").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) return toast.error(error.message);
    const patch: any = { id: cfg.id };
    patch[kind === "cer" ? "csd_cer_path" : "csd_key_path"] = `cfdi-csd/${path}`;
    await upsert.mutateAsync(patch);
  }
  return (
    <div className="grid gap-2 pt-2 border-t">
      <div className="text-xs font-semibold text-muted-foreground">CSD ({cfg.modo})</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <Label className="text-xs">Certificado (.cer)</Label>
          <Input type="file" accept=".cer" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload("cer", e.target.files[0])} />
          {cfg.csd_cer_path && <div className="text-[10px] text-emerald-600 mt-1">✓ subido</div>}
        </div>
        <div>
          <Label className="text-xs">Llave privada (.key)</Label>
          <Input type="file" accept=".key" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload("key", e.target.files[0])} />
          {cfg.csd_key_path && <div className="text-[10px] text-emerald-600 mt-1">✓ subida</div>}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1"><Label className="text-xs">Contraseña CSD</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={() => upsert.mutate({ id: cfg.id, csd_password: pwd })}>Guardar contraseña</Button>
      </div>
    </div>
  );
}