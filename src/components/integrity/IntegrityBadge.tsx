import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Table = "medical_records" | "recetas" | "estudios_solicitados";

type VerifyResult = {
  valid: boolean;
  status: "verified" | "pending_signature" | "broken" | "unsigned" | "not_found";
  payload_ok?: boolean;
  chain_ok?: boolean;
  has_signature?: boolean;
  signature_ok?: boolean | null;
  key_id?: string;
  signed_at?: string;
  algorithm_version?: string;
  record_hash?: string;
};

async function verify(table: Table, id: string, deep = false): Promise<VerifyResult> {
  if (deep) {
    const { data, error } = await supabase.functions.invoke("verify-record-integrity", {
      body: { table, id },
    });
    if (error) throw error;
    return data as VerifyResult;
  }
  const { data, error } = await supabase.rpc("verify_record_hash", { _table: table, _id: id });
  if (error) throw error;
  return data as unknown as VerifyResult;
}

export function IntegrityBadge({ table, id, compact }: { table: Table; id: string; compact?: boolean }) {
  const query = useQuery({
    queryKey: ["integrity", table, id],
    queryFn: () => verify(table, id, false),
    staleTime: 60_000,
  });

  const deep = useMutation({
    mutationFn: () => verify(table, id, true),
    onSuccess: (r) => {
      if (r.valid && r.signature_ok !== false) toast.success("Firma HMAC verificada");
      else if (r.signature_ok === false) toast.error("Firma HMAC inválida");
      else toast.info(`Estado: ${r.status}`);
    },
    onError: (e: any) => toast.error(e.message ?? "Error verificando firma"),
  });

  const r = deep.data ?? query.data;
  const loading = query.isLoading;

  const cfg = (() => {
    if (loading) return { icon: Loader2, label: "Verificando…", variant: "secondary" as const, spin: true };
    if (!r) return { icon: ShieldQuestion, label: "Sin datos", variant: "secondary" as const };
    if (r.status === "verified") return { icon: ShieldCheck, label: "Íntegro", variant: "default" as const };
    if (r.status === "pending_signature") return { icon: CheckCircle2, label: "Pendiente firma", variant: "secondary" as const };
    if (r.status === "unsigned") return { icon: ShieldQuestion, label: "Sin firmar", variant: "outline" as const };
    return { icon: ShieldAlert, label: "Cadena rota", variant: "destructive" as const };
  })();

  const Icon = cfg.icon;

  if (compact) {
    return (
      <Badge variant={cfg.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${cfg.spin ? "animate-spin" : ""}`} />
        {cfg.label}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={cfg.variant}
        className="gap-1"
        title={
          r
            ? [
                `Tabla: ${table}`,
                `Registro: ${id}`,
                r.algorithm_version && `Algoritmo: ${r.algorithm_version}`,
                r.key_id && `Llave: ${r.key_id}`,
                r.record_hash && `Hash: ${r.record_hash.slice(0, 16)}…`,
                r.signed_at && `Firmado: ${r.signed_at}`,
              ].filter(Boolean).join("\n")
            : undefined
        }
      >
        <Icon className={`h-3 w-3 ${cfg.spin ? "animate-spin" : ""}`} />
        {cfg.label}
      </Badge>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => deep.mutate()}
        disabled={deep.isPending || loading}
      >
        {deep.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verificar firma"}
      </Button>
      {r?.algorithm_version && (
        <span className="text-xs text-muted-foreground font-mono">{r.algorithm_version}</span>
      )}
      {r?.key_id && <span className="text-xs text-muted-foreground">· {r.key_id}</span>}
    </div>
  );
}