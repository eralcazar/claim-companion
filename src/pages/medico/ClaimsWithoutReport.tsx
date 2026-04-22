import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileWarning, Download } from "lucide-react";
import { toast } from "sonner";

export default function ClaimsWithoutReport() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["claims-without-report", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // 1) Get appointments where this doctor attended
      const { data: appts } = await supabase
        .from("appointments")
        .select("user_id")
        .eq("doctor_id", user!.id);
      const patientIds = Array.from(new Set((appts ?? []).map((a) => a.user_id)));
      if (patientIds.length === 0) return [];

      // 2) Get claims for those patients
      const { data: claims } = await supabase
        .from("claims")
        .select("id, user_id, diagnosis, incident_date, policy_id")
        .in("user_id", patientIds)
        .order("incident_date", { ascending: false });
      const claimIds = (claims ?? []).map((c) => c.id);
      if (claimIds.length === 0) return [];

      // 3) Find which claims already have an "informe_medico" doc
      const { data: docs } = await supabase
        .from("claim_documents")
        .select("claim_id, tipo_documento")
        .in("claim_id", claimIds)
        .eq("tipo_documento", "informe_medico");
      const withReport = new Set((docs ?? []).map((d) => d.claim_id));

      // 4) Get policy → insurer mapping
      const policyIds = Array.from(new Set((claims ?? []).map((c) => c.policy_id).filter(Boolean)));
      const { data: policies } = await supabase
        .from("insurance_policies")
        .select("id, company, policy_number")
        .in("id", policyIds);
      const policyMap = new Map((policies ?? []).map((p) => [p.id, p]));

      // 5) Get insurer formats marked as informe_medico
      const { data: aseguradoras } = await supabase
        .from("aseguradoras")
        .select("id, nombre, slug");
      const { data: formats } = await supabase
        .from("formularios")
        .select("id, aseguradora_id, nombre_display, storage_path")
        .eq("es_informe_medico", true)
        .eq("activo", true);

      const formatByAseguradoraName = new Map<string, any>();
      for (const f of formats ?? []) {
        const a = (aseguradoras ?? []).find((x) => x.id === f.aseguradora_id);
        if (a) formatByAseguradoraName.set(a.nombre.toLowerCase(), f);
      }

      return (claims ?? [])
        .filter((c) => !withReport.has(c.id))
        .map((c) => {
          const pol = policyMap.get(c.policy_id);
          const fmt = pol ? formatByAseguradoraName.get((pol.company ?? "").toLowerCase()) : null;
          return { ...c, policy: pol, informe_format: fmt };
        });
    },
  });

  const downloadFormat = async (storagePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("formatos")
        .createSignedUrl(storagePath, 3600);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Error al descargar");
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <FileWarning className="h-6 w-6 text-primary" />
        Reclamos sin informe médico
      </h1>
      <p className="text-sm text-muted-foreground">
        Reclamos de pacientes que atiendes y aún no tienen un informe médico cargado.
      </p>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Todos los reclamos tienen informe médico cargado.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium">{c.diagnosis}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.policy?.company ?? "—"} · Póliza {c.policy?.policy_number ?? "—"}
                    </p>
                  </div>
                  {c.informe_format ? (
                    <Button size="sm" variant="outline" onClick={() => downloadFormat(c.informe_format.storage_path)}>
                      <Download className="h-4 w-4 mr-1" />
                      Formato informe
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin formato configurado</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}