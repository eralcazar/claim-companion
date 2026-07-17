import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { RefreshCw, ShieldCheck, Download } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function IntegrityDashboard() {
  const qc = useQueryClient();
  const [logFrom, setLogFrom] = useState(() => format(new Date(Date.now() - 7 * 86400_000), "yyyy-MM-dd"));
  const [logTo, setLogTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [logTable, setLogTable] = useState<string>("all");

  const { data: keys } = useQuery({
    queryKey: ["integrity-keys"],
    queryFn: async () => {
      const { data } = await supabase.from("integrity_keys").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: roots } = useQuery({
    queryKey: ["integrity-daily-roots"],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrity_daily_roots")
        .select("*")
        .order("day", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const { data: verifLog } = useQuery({
    queryKey: ["integrity-verif-log", logFrom, logTo, logTable],
    queryFn: async () => {
      let q = supabase
        .from("integrity_verification_log")
        .select("*")
        .gte("created_at", `${logFrom}T00:00:00Z`)
        .lte("created_at", `${logTo}T23:59:59Z`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (logTable !== "all") q = q.eq("table_name", logTable);
      const { data } = await q;
      return data ?? [];
    },
  });

  const exportCsv = () => {
    const rows = verifLog ?? [];
    const cols = [
      "created_at","verifier_type","verifier_id","table_name","record_id","patient_id",
      "status","payload_ok","chain_ok","signature_ok","has_signature","key_id",
      "algorithm_version","share_token","ip","user_agent",
    ];
    const esc = (v: any) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const csv = [cols.join(","), ...rows.map((r: any) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitacora-verificaciones-${logFrom}_a_${logTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { data: pending } = useQuery({
    queryKey: ["integrity-pending"],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const t of ["medical_records", "recetas", "estudios_solicitados"] as const) {
        const { count } = await supabase.from(t).select("*", { count: "exact", head: true }).is("signature", null);
        counts[t] = count ?? 0;
      }
      return counts;
    },
  });

  const signNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sign-pending-records", {});
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { toast.success(`Firmados: ${JSON.stringify(d)}`); qc.invalidateQueries({ queryKey: ["integrity-pending"] }); },
    onError: (e: any) => toast.error(e.message || "Error firmando"),
  });

  const closeRoot = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("close-daily-integrity-root", {});
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => { toast.success(`Raíz diaria: ${d?.daily_root?.slice(0, 12)}…`); qc.invalidateQueries({ queryKey: ["integrity-daily-roots"] }); },
    onError: (e: any) => toast.error(e.message || "Error cerrando raíz"),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Integridad clínica
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => signNow.mutate()} disabled={signNow.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1 ${signNow.isPending ? "animate-spin" : ""}`} /> Firmar pendientes
          </Button>
          <Button size="sm" onClick={() => closeRoot.mutate()} disabled={closeRoot.isPending}>
            Cerrar raíz de hoy
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Pendientes de firma</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-center">
          {pending && Object.entries(pending).map(([k, v]) => (
            <div key={k}>
              <div className="text-xs text-muted-foreground">{k}</div>
              <div className="text-2xl font-bold">{v}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Llaves de firma</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {keys?.map((k: any) => (
            <div key={k.key_id} className="flex items-center justify-between text-sm border rounded-md p-2">
              <div>
                <div className="font-mono">{k.key_id}</div>
                <div className="text-xs text-muted-foreground">{k.algorithm} · creado {format(new Date(k.created_at), "PP")}</div>
              </div>
              <Badge variant={k.status === "active" ? "default" : "secondary"}>{k.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Raíces diarias (últimas 30)</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-xs font-mono">
          {roots?.map((r: any) => (
            <div key={r.day} className="flex justify-between border-b py-1">
              <span>{r.day}</span>
              <span className="truncate max-w-[60%]" title={r.daily_root}>{r.daily_root}</span>
            </div>
          ))}
          {!roots?.length && <div className="text-muted-foreground">Sin raíces publicadas todavía</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bitácora de verificaciones</span>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!verifLog?.length}>
              <Download className="h-4 w-4 mr-1" /> Exportar CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input type="date" value={logFrom} onChange={(e) => setLogFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input type="date" value={logTo} onChange={(e) => setLogTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tabla</label>
              <Select value={logTable} onValueChange={setLogTable}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="medical_records">medical_records</SelectItem>
                  <SelectItem value="recetas">recetas</SelectItem>
                  <SelectItem value="estudios_solicitados">estudios_solicitados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Total mostrado: {verifLog?.length ?? 0} (máx 500)</div>
          <div className="max-h-96 overflow-auto text-xs">
            <table className="w-full">
              <thead className="text-muted-foreground text-left sticky top-0 bg-background">
                <tr>
                  <th className="py-1 pr-2">Fecha</th>
                  <th className="py-1 pr-2">Quién</th>
                  <th className="py-1 pr-2">Tabla</th>
                  <th className="py-1 pr-2">Estado</th>
                  <th className="py-1 pr-2">Firma</th>
                  <th className="py-1 pr-2">Algoritmo</th>
                </tr>
              </thead>
              <tbody>
                {verifLog?.map((r: any) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-1 pr-2 whitespace-nowrap">{format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}</td>
                    <td className="py-1 pr-2">{r.verifier_type}</td>
                    <td className="py-1 pr-2">{r.table_name}</td>
                    <td className="py-1 pr-2">{r.status}</td>
                    <td className="py-1 pr-2">{r.signature_ok === null ? "—" : r.signature_ok ? "ok" : "falla"}</td>
                    <td className="py-1 pr-2 font-mono">{r.algorithm_version}</td>
                  </tr>
                ))}
                {!verifLog?.length && <tr><td colSpan={6} className="text-center text-muted-foreground py-4">Sin verificaciones en el rango</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}