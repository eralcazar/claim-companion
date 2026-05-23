import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const ODONT_ESTADOS = [
  { value: "sano", label: "Sano", color: "#22c55e" },
  { value: "caries", label: "Caries", color: "#ef4444" },
  { value: "obturacion", label: "Obturación", color: "#3b82f6" },
  { value: "corona", label: "Corona", color: "#a855f7" },
  { value: "endodoncia", label: "Endodoncia", color: "#f59e0b" },
  { value: "implante", label: "Implante", color: "#14b8a6" },
  { value: "ausente", label: "Ausente", color: "#94a3b8" },
  { value: "fractura", label: "Fractura", color: "#dc2626" },
];

export function useOdontograma(patientId?: string, soloVigentes = true) {
  return useQuery({
    queryKey: ["odontograma", patientId, soloVigentes],
    enabled: !!patientId,
    queryFn: async () => {
      let q = supabase.from("odontograma_states" as any).select("*").eq("patient_id", patientId!);
      if (soloVigentes) q = q.eq("vigente", true);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useSetToothState() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: { patient_id: string; pieza: number; superficie: string | null; estado: string; notas?: string }) => {
      const color = ODONT_ESTADOS.find((e) => e.value === payload.estado)?.color ?? null;
      // Marca el vigente anterior (misma pieza+superficie) como superado
      const { data: prev } = await supabase
        .from("odontograma_states" as any)
        .select("id")
        .eq("patient_id", payload.patient_id)
        .eq("pieza", payload.pieza)
        .is("superficie", payload.superficie === null ? null : undefined as any)
        .eq("vigente", true);
      // Filtrar superficie en JS porque .is no maneja igualdad de strings
      const prevSameSurface = (prev ?? []).filter((r: any) => true); // dejamos que el segundo update lo filtre por pieza+vigente
      // Mejor: re-query estricto
      const { data: prevExact } = await supabase
        .from("odontograma_states" as any)
        .select("id, superficie")
        .eq("patient_id", payload.patient_id)
        .eq("pieza", payload.pieza)
        .eq("vigente", true);
      const toSupersede = (prevExact ?? []).filter((r: any) => (r.superficie ?? null) === payload.superficie);

      const { data: inserted, error: insErr } = await supabase
        .from("odontograma_states" as any)
        .insert({
          patient_id: payload.patient_id,
          pieza: payload.pieza,
          superficie: payload.superficie,
          estado: payload.estado,
          color,
          notas: payload.notas ?? null,
          vigente: true,
          created_by: user!.id,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      if (toSupersede.length) {
        const ids = toSupersede.map((r: any) => r.id);
        await supabase
          .from("odontograma_states" as any)
          .update({ vigente: false, superseded_by: (inserted as any).id, superseded_at: new Date().toISOString() })
          .in("id", ids);
      }
      // evita unused
      void prevSameSurface;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["odontograma"] });
      toast.success("Estado actualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}