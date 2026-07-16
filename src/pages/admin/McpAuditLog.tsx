import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

type McpLog = {
  id: string;
  created_at: string;
  user_email: string | null;
  user_id: string | null;
  tool_name: string;
  params_summary: Record<string, unknown>;
  status: string;
  error: string | null;
  duration_ms: number | null;
  client_id: string | null;
};

function toCsv(rows: McpLog[]): string {
  const header = [
    "fecha",
    "usuario",
    "user_id",
    "cliente_mcp",
    "herramienta",
    "estado",
    "duracion_ms",
    "error",
    "params",
  ];
  const escape = (v: unknown) => {
    const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.created_at,
        r.user_email ?? "",
        r.user_id ?? "",
        r.client_id ?? "",
        r.tool_name,
        r.status,
        r.duration_ms ?? "",
        r.error ?? "",
        r.params_summary ?? {},
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}

export default function McpAuditLog() {
  const { roles, loading } = useAuth();
  const isAdmin = roles.includes("admin" as any);

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [toolFilter, setToolFilter] = useState("");

  const query = useQuery({
    queryKey: ["mcp_audit", from, to, toolFilter],
    enabled: isAdmin,
    queryFn: async () => {
      let q = supabase
        .from("mcp_tool_call_logs" as any)
        .select("*")
        .gte("created_at", `${from}T00:00:00.000Z`)
        .lte("created_at", `${to}T23:59:59.999Z`)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (toolFilter) q = q.ilike("tool_name", `%${toolFilter}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as McpLog[];
    },
  });

  if (loading) return <p className="p-6 text-muted-foreground">Cargando...</p>;
  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <ShieldAlert className="h-8 w-8 mx-auto text-destructive" />
            <p className="font-medium">Acceso restringido</p>
            <p className="text-sm text-muted-foreground">Solo administradores pueden ver la auditoría MCP.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = query.data ?? [];
  const stats = useMemo(() => {
    const byTool = new Map<string, number>();
    let errors = 0;
    for (const r of rows) {
      byTool.set(r.tool_name, (byTool.get(r.tool_name) ?? 0) + 1);
      if (r.status !== "ok") errors++;
    }
    return { total: rows.length, errors, byTool: [...byTool.entries()].sort((a, b) => b[1] - a[1]) };
  }, [rows]);

  const download = () => {
    if (rows.length === 0) {
      toast.info("No hay registros para exportar");
      return;
    }
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mcp-audit-${from}_a_${to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Auditoría MCP</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Registro de todas las llamadas a herramientas MCP. No se almacenan valores
        de parámetros: sólo tipos y longitudes para poder detectar abusos sin
        exponer datos clínicos.
      </p>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div><Label>Desde</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><Label>Herramienta</Label><Input placeholder="Ej: list_recetas" value={toolFilter} onChange={(e) => setToolFilter(e.target.value)} /></div>
          <Button onClick={download} className="gap-2" disabled={rows.length === 0}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardHeader><CardTitle className="text-sm">Llamadas</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.total}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Errores</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-destructive">{stats.errors}</CardContent></Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Top herramientas</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {stats.byTool.slice(0, 6).map(([t, n]) => (
              <Badge key={t} variant="secondary">{t} · {n}</Badge>
            ))}
            {stats.byTool.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimas llamadas</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {query.isLoading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">Sin registros en el rango.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Usuario</th>
                  <th className="p-2">Herramienta</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">ms</th>
                  <th className="p-2">Parámetros</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("es-MX")}</td>
                    <td className="p-2">{r.user_email ?? <span className="text-muted-foreground">anónimo</span>}</td>
                    <td className="p-2 font-mono">{r.tool_name}</td>
                    <td className="p-2">
                      <Badge variant={r.status === "ok" ? "secondary" : "destructive"}>{r.status}</Badge>
                    </td>
                    <td className="p-2 tabular-nums">{r.duration_ms ?? "—"}</td>
                    <td className="p-2 text-xs text-muted-foreground max-w-[280px] truncate" title={JSON.stringify(r.params_summary)}>
                      {JSON.stringify(r.params_summary)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}