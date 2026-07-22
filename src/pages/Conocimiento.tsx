import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, BookOpen, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Result = {
  document_id: string;
  chunk_id: string;
  title: string;
  category: string;
  source: string;
  source_url: string | null;
  snippet: string;
  similarity: number;
};

const CATEGORIES = [
  { key: "medicamentos", label: "Medicamentos" },
  { key: "guia_clinica", label: "Guías clínicas" },
  { key: "estudio", label: "Estudios" },
  { key: "nutricion", label: "Nutrición" },
  { key: "receta", label: "Recetas" },
  { key: "general", label: "General" },
];

export default function Conocimiento() {
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  const toggleCat = (k: string) =>
    setCats((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  const search = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("knowledge-search", {
        body: { query: q, categories: cats.length ? cats : null, rerank: true, limit: 8 },
      });
      if (error) throw error;
      setResults((data?.results ?? []) as Result[]);
    } catch (e: any) {
      toast.error("Búsqueda fallida", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Conocimiento clínico</h1>
          <p className="text-sm text-muted-foreground">
            Busca información validada de medicamentos, estudios, guías clínicas y nutrición.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ej.: paracetamol dosis, hemoglobina glucosilada, HTA…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button onClick={search} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <Badge
                key={c.key}
                variant={cats.includes(c.key) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleCat(c.key)}
              >
                {c.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {results.length === 0 && !loading && (
        <p className="text-center text-sm text-muted-foreground">
          Escribe un término y presiona buscar.
        </p>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <Card key={r.chunk_id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{r.title}</CardTitle>
                <Badge variant="secondary">{Math.round(r.similarity * 100)}%</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                <span>{r.source}</span>
                {r.source_url && (
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    fuente <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm leading-relaxed">{r.snippet}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}