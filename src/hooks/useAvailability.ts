import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AvailabilitySlot = {
  id: string;
  professional_id: string;
  location_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  modalidad: "presencial" | "video" | "domicilio";
  activo: boolean;
};

export type ProSlot = {
  slot_start: string;
  slot_end: string;
  location_id: string | null;
  modalidad: "presencial" | "video" | "domicilio";
};

export function useAvailability(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["availability", professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("professional_availability")
        .select("*")
        .eq("professional_id", professionalId!)
        .order("weekday")
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as AvailabilitySlot[];
    },
  });
}

export function useSaveAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<AvailabilitySlot> & { professional_id: string }) => {
      const { id, ...rest } = row as any;
      if (id) {
        const { error } = await (supabase as any)
          .from("professional_availability")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("professional_availability")
          .insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["availability", v.professional_id] });
      toast.success("Horario guardado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al guardar"),
  });
}

export function useDeleteAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, professional_id }: { id: string; professional_id: string }) => {
      const { error } = await (supabase as any)
        .from("professional_availability")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return professional_id;
    },
    onSuccess: (pid) => {
      qc.invalidateQueries({ queryKey: ["availability", pid] });
      toast.success("Horario eliminado");
    },
  });
}

export function useProfessionalSlots(
  professionalId: string | undefined,
  fromISO: string,
  toISO: string,
) {
  return useQuery({
    queryKey: ["pro-slots", professionalId, fromISO, toISO],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_professional_slots", {
        _professional_id: professionalId,
        _from: fromISO,
        _to: toISO,
      });
      if (error) throw error;
      return (data ?? []) as ProSlot[];
    },
  });
}

export function useReserveSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      professionalUserId: string;
      slotStart: string;
      modalidad: "presencial" | "video" | "domicilio";
      notes?: string;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Debes iniciar sesión");

      const payload: any = {
        user_id: uid,
        doctor_id: args.professionalUserId,
        appointment_date: args.slotStart,
        appointment_type: "consulta",
        notes: args.notes ?? "",
        is_telemedicine: args.modalidad === "video",
        meeting_url:
          args.modalidad === "video"
            ? `https://meet.jit.si/carecentral-${crypto.randomUUID()}`
            : null,
      };
      const { data, error } = await supabase
        .from("appointments")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pro-slots"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Cita reservada");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo reservar"),
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      appointment_id: string;
      professional_id: string;
      rating: number;
      puntualidad?: number;
      trato?: number;
      claridad?: number;
      comentario?: string;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Debes iniciar sesión");
      const { error } = await (supabase as any).from("appointment_reviews").insert({
        ...args,
        patient_id: uid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professional-reviews"] });
      qc.invalidateQueries({ queryKey: ["my-appointment-reviews"] });
      toast.success("Gracias por tu reseña");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo enviar la reseña"),
  });
}

export function useMyAppointmentReviews() {
  return useQuery({
    queryKey: ["my-appointment-reviews"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return [];
      const { data, error } = await (supabase as any)
        .from("appointment_reviews")
        .select("appointment_id")
        .eq("patient_id", uid);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.appointment_id as string);
    },
  });
}

export function useProfessionalByDoctorUserId(doctorUserId: string | undefined) {
  return useQuery({
    queryKey: ["pro-by-user", doctorUserId],
    enabled: !!doctorUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_profiles")
        .select("id, slug, display_name, publicado")
        .eq("user_id", doctorUserId!)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; slug: string; display_name: string; publicado: boolean } | null;
    },
  });
}