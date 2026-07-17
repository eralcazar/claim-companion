import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { RefreshCw, ShieldCheck } from "lucide-react";

export default function IntegrityDashboard() {
  const qc = useQueryClient();

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
    </div>
  );
}