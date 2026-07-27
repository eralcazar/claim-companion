import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { Download, Link2, ShieldAlert, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BridgeEvent = {
  id: string;
  created_at: string;
  event_type: string;
  user_id: string | null;
  mexicoes_user_id: string | null;
  payload: Record<string, unknown> | null;
  success: boolean;
  error_message: string | null;
};

const EVENT_TYPES = [
  { value: "link", label: "Vinculación" },
  { value: "unlink", label: "Desvinculación" },
  { value: "sync_entitlements", label: "Sync entitlements" },
  { value: "create_home_visit", label: "Visita a domicilio" },
  { value: "status", label: "Consulta de estado" },
  { value: "self_test", label: "Prueba de conexión" },
];

function labelFor(type: string) {
  return EVENT_TYPES.find((e) => e.value === type)?.label ?? type;
}

function toCsv(rows: BridgeEvent[], nameOf: (id: string | null) => string): string {
  const header = ["fecha", "accion", "usuario", "user_id", "mexicoes_user_id", "exito", "error", "payload"];
  const escape = (v: unknown) => {
    const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [
    header.join(","),
    ...rows.map((r) =>
      [
        r.created_at,
        r.event_type,
        nameOf(r.user_id),
        r.user_id ?? "",
        r.mexicoes_user_id ?? "",
        r.success ? "sí" : "no",
        r.error_message ?? "",
        r.payload ?? {},
      ]
        .map(escape)
        .join(","),
    ),
  ].join("\n");
}

export default function MexicoEsBridgeAudit() {
  const { roles, loading } = useAuth();
  const isAdmin = roles.includes("admin" as any);

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [eventType, setEventType] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [status, setStatus] = useState("all");

  const query = useQuery({
    queryKey: ["mexicoes_bridge_events", from, to, eventType, status],
    enabled: isAdmin,
    queryFn: async () => {
      let q = supabase
        .from("mexicoes_bridge_events" as any)
        .select("*")
        .gte("created_at", `${from}T00:00:00.000Z`)
        .lte("created_at", `${to}T23:59:59.999Z`)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (eventType !== "all") q = q.eq("event_type", eventType);
      if (status !== "all") q = q.eq("success", status === "ok");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as BridgeEvent[];
    },
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const userIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[],
    [rows],
  );

  const profiles = useQuery({
    queryKey: ["mexicoes_bridge_profiles", userIds],
    enabled: isAdmin && userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      if (error) throw error;
      const map = new Map<string, { full_name: string | null; email: string | null }>();
      for (const p of data ?? []) map.set(p.id, { full_name: (p as any).full_name, email: (p as any).email });
      return map;
    },
  });

  const nameOf = (id: string | null) => {
    if (!id) return "—";
    const p = profiles.data?.get(id);
    return p?.full_name || p?.email || id.slice(0, 8);
  };

  const filtered = useMemo(() => {
    const term = userFilter.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const p = r.user_id ? profiles.data?.get(r.user_id) : null;
      return (
        (r.user_id ?? "").toLowerCase().includes(term) ||
        (r.mexicoes_user_id ?? "").toLowerCase().includes(term) ||
        (p?.full_name ?? "").toLowerCase().includes(term) ||
        (p?.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, userFilter, profiles.data]);

  const stats = useMemo(() => {
    const byType = new Map<string, number>();
    let errors = 0;
    for (const r of filtered) {
      byType.set(r.event_type, (byType.get(r.event_type) ?? 0) + 1);
      if (!r.success) errors++;
    }
    return { total: filtered.length, errors, byType: [...byType.entries()].sort((a, b) => b[1] - a[1]) };
  }, [filtered]);

  if (loading) return <p className="p-6 text-muted-foreground">Cargando…</p>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const download = () => {
    if (filtered.length === 0) {
      toast.info("No hay registros para exportar");
      return;
    }
    const blob = new Blob([toCsv(filtered, nameOf)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mexicoes-bridge-${from}_a_${to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Auditoría puente MexicoEs</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${query.isFetching ? "animate-spin" : ""}`} /> Actualizar
          </Button>
          <Button variant="secondary" size="sm" onClick={download}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="from">Desde</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">Hasta</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Acción</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {EVENT_TYPES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Resultado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ok">Exitosos</SelectItem>
                <SelectItem value="error">Con error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="user">Usuario</Label>
            <Input
              id="user"
              placeholder="Nombre, correo o ID"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Eventos</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Con error</p><p className="text-2xl font-bold text-destructive">{stats.errors}</p></CardContent></Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Por acción</p>
            <div className="flex flex-wrap gap-1">
              {stats.byType.length === 0 ? (
                <span className="text-sm">—</span>
              ) : (
                stats.byType.map(([t, n]) => (
                  <Badge key={t} variant="secondary">{labelFor(t)}: {n}</Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">Fecha</th>
                <th className="p-3 font-medium">Acción</th>
                <th className="p-3 font-medium">Usuario</th>
                <th className="p-3 font-medium">Cuenta MexicoEs</th>
                <th className="p-3 font-medium">Resultado</th>
                <th className="p-3 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr><td className="p-4 text-muted-foreground" colSpan={6}>Cargando…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="p-4 text-muted-foreground" colSpan={6}>Sin eventos para los filtros seleccionados.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString("es-MX")}</td>
                    <td className="p-3"><Badge variant="outline">{labelFor(r.event_type)}</Badge></td>
                    <td className="p-3">{nameOf(r.user_id)}</td>
                    <td className="p-3"><code className="text-xs">{r.mexicoes_user_id ?? "—"}</code></td>
                    <td className="p-3">
                      <Badge variant={r.success ? "secondary" : "destructive"}>{r.success ? "OK" : "Error"}</Badge>
                    </td>
                    <td className="p-3 max-w-md">
                      {r.error_message ? (
                        <span className="text-destructive text-xs break-words">{r.error_message}</span>
                      ) : (
                        <code className="text-xs text-muted-foreground break-all">
                          {JSON.stringify(r.payload ?? {}).slice(0, 160)}
                        </code>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
