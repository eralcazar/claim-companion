import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ScheduleRow = {
  id: string;
  user_id: string;
  medication_id: string;
  receta_item_id: string | null;
  started_at: string;
  next_dose_at: string;
  interval_hours: number;
  ends_at: string | null;
  active: boolean;
  last_dose_at: string | null;
};

const FREQ_TO_HOURS: Record<string, { enum: string; hours: number }> = {
  cada_4h: { enum: "cada_4_horas", hours: 4 },
  cada_6h: { enum: "cada_6_horas", hours: 6 },
  cada_8h: { enum: "cada_8_horas", hours: 8 },
  cada_12h: { enum: "cada_12_horas", hours: 12 },
  cada_24h: { enum: "cada_24_horas", hours: 24 },
  cada_48h: { enum: "cada_48_horas", hours: 48 },
  semanal: { enum: "semanal", hours: 168 },
};

function mapFrequency(item: any) {
  if (item.frecuencia === "otro") {
    const h = Number(item.frecuencia_horas) || 8;
    return { enum: "personalizado", hours: h };
  }
  return FREQ_TO_HOURS[item.frecuencia] ?? { enum: "cada_8_horas", hours: 8 };
}

export function useActiveSchedules(userId?: string) {
  return useQuery({
    queryKey: ["medication_schedule", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_schedule")
        .select("*")
        .eq("active", true)
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as ScheduleRow[];
    },
    enabled: !!userId,
  });
}

export function useStartTakingMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, receta }: { item: any; receta: any }) => {
      const { enum: freqEnum, hours } = mapFrequency(item);
      const dosage = [item.dosis, item.unidad_dosis].filter(Boolean).join("") || "—";
      const today = new Date();
      const days = Number(item.dias_a_tomar) || null;
      const endDate = days ? new Date(today.getTime() + days * 86400000) : null;

      // 1. Upsert medication
      let medicationId: string;
      const { data: existing } = await supabase
        .from("medications")
        .select("id")
        .eq("user_id", receta.patient_id)
        .eq("receta_item_id", item.id)
        .maybeSingle();

      if (existing) {
        medicationId = existing.id;
        await supabase
          .from("medications")
          .update({
            name: item.medicamento_nombre,
            dosage,
            frequency: freqEnum as any,
            frequency_hours: hours,
            start_date: today.toISOString().slice(0, 10),
            end_date: endDate ? endDate.toISOString().slice(0, 10) : null,
            active: true,
          })
          .eq("id", medicationId);
      } else {
        const { data: created, error: insErr } = await supabase
          .from("medications")
          .insert({
            user_id: receta.patient_id,
            receta_item_id: item.id,
            name: item.medicamento_nombre,
            dosage,
            frequency: freqEnum as any,
            frequency_hours: hours,
            start_date: today.toISOString().slice(0, 10),
            end_date: endDate ? endDate.toISOString().slice(0, 10) : null,
            active: true,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        medicationId = created.id;
      }

      // 2. Deactivate any previous schedule for this receta_item
      await supabase
        .from("medication_schedule")
        .update({ active: false })
        .eq("receta_item_id", item.id)
        .eq("active", true);

      // 3. Insert new schedule
      const nextDose = new Date(today.getTime() + hours * 3600000);
      const { error: schedErr } = await supabase.from("medication_schedule").insert({
        user_id: receta.patient_id,
        medication_id: medicationId,
        receta_item_id: item.id,
        next_dose_at: nextDose.toISOString(),
        interval_hours: hours,
        ends_at: endDate ? endDate.toISOString() : null,
        active: true,
      });
      if (schedErr) throw schedErr;

      return { hours };
    },
    onSuccess: ({ hours }) => {
      qc.invalidateQueries({ queryKey: ["medication_schedule"] });
      qc.invalidateQueries({ queryKey: ["medications"] });
      toast.success(`Recordatorios activados — primera notificación en ${hours}h`);
    },
    onError: (e: any) => toast.error("No se pudo activar: " + e.message),
  });
}

export function useStopTakingMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from("medication_schedule")
        .update({ active: false })
        .eq("id", scheduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medication_schedule"] });
      qc.invalidateQueries({ queryKey: ["medications"] });
      toast.success("Recordatorios detenidos");
    },
    onError: (e: any) => toast.error("Error: " + e.message),
  });
}