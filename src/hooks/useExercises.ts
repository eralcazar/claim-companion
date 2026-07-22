import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ExerciseCatalog = {
  id: string;
  slug: string;
  name: string;
  category: "fuerza" | "cardio" | "movilidad" | "deporte";
  environment: "gym" | "calle" | "casa" | "ambos";
  muscle_group: string | null;
  equipment: string | null;
  metric_type: "reps_weight" | "distance_time" | "time_only" | "reps_only";
  icon: string | null;
  is_public: boolean;
};

export type SessionLog = {
  id: string;
  patient_id: string;
  fecha: string;
  environment: "gym" | "calle" | "casa";
  location_label: string | null;
  duration_min: number | null;
  rpe: number | null;
  hr_avg: number | null;
  calories: number | null;
  notes: string | null;
  warmup_notes: string | null;
  discomforts: string | null;
  session_rest_sec: number | null;
  created_at: string;
};

export type SetLog = {
  id: string;
  session_log_id: string;
  exercise_id: string;
  patient_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  distance_m: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
  rpe: number | null;
  notes: string | null;
  created_at: string;
};

export function useExerciseCatalog() {
  return useQuery({
    queryKey: ["exercise_catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_catalog" as any)
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as ExerciseCatalog[];
    },
  });
}

export function useSessionLogs(days = 90) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["exercise_sessions", user?.id, days],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("exercise_session_logs" as any)
        .select("*")
        .eq("patient_id", user!.id)
        .gte("fecha", since.toISOString().slice(0, 10))
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SessionLog[];
    },
  });
}

export function useAllSetLogs(days = 365) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["exercise_sets_all", user?.id, days],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("exercise_set_logs" as any)
        .select("*")
        .eq("patient_id", user!.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SetLog[];
    },
  });
}

export function useSetsByExercise(exerciseId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["exercise_sets_by_ex", user?.id, exerciseId],
    enabled: !!user && !!exerciseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_set_logs" as any)
        .select("*, session:exercise_session_logs(fecha, environment, rpe)")
        .eq("patient_id", user!.id)
        .eq("exercise_id", exerciseId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export type NewWorkoutPayload = {
  fecha: string;
  environment: "gym" | "calle" | "casa";
  location_label?: string;
  duration_min?: number;
  rpe?: number;
  notes?: string;
  warmup_notes?: string;
  discomforts?: string;
  session_rest_sec?: number;
  items: Array<{
    exercise_id: string;
    sets: Array<{
      set_number: number;
      reps?: number;
      weight_kg?: number;
      distance_m?: number;
      duration_sec?: number;
      rest_sec?: number;
      rpe?: number;
    }>;
  }>;
};

export function useCreateWorkout() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NewWorkoutPayload) => {
      if (!user) throw new Error("Sin sesión");
      const { data: session, error: se } = await supabase
        .from("exercise_session_logs" as any)
        .insert({
          patient_id: user.id,
          fecha: payload.fecha,
          environment: payload.environment,
          location_label: payload.location_label ?? null,
          duration_min: payload.duration_min ?? null,
          rpe: payload.rpe ?? null,
          notes: payload.notes ?? null,
          warmup_notes: payload.warmup_notes ?? null,
          discomforts: payload.discomforts ?? null,
          session_rest_sec: payload.session_rest_sec ?? null,
        })
        .select()
        .single();
      if (se) throw se;
      const sessionId = (session as any).id as string;
      const rows = payload.items.flatMap((it) =>
        it.sets.map((s) => ({
          session_log_id: sessionId,
          exercise_id: it.exercise_id,
          patient_id: user.id,
          set_number: s.set_number,
          reps: s.reps ?? null,
          weight_kg: s.weight_kg ?? null,
          distance_m: s.distance_m ?? null,
          duration_sec: s.duration_sec ?? null,
          rest_sec: s.rest_sec ?? null,
          rpe: s.rpe ?? null,
        })),
      );
      if (rows.length) {
        const { error: setErr } = await supabase.from("exercise_set_logs" as any).insert(rows);
        if (setErr) throw setErr;
      }
      return sessionId;
    },
    onSuccess: () => {
      toast.success("Entrenamiento registrado");
      qc.invalidateQueries({ queryKey: ["exercise_sessions"] });
      qc.invalidateQueries({ queryKey: ["exercise_sets_all"] });
      qc.invalidateQueries({ queryKey: ["exercise_sets_by_ex"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo registrar"),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercise_session_logs" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sesión eliminada");
      qc.invalidateQueries({ queryKey: ["exercise_sessions"] });
      qc.invalidateQueries({ queryKey: ["exercise_sets_all"] });
    },
  });
}

export type UpdateWorkoutPayload = NewWorkoutPayload & { session_id: string };

export function useUpdateWorkout() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateWorkoutPayload) => {
      if (!user) throw new Error("Sin sesión");
      const { error: se } = await supabase
        .from("exercise_session_logs" as any)
        .update({
          fecha: payload.fecha,
          environment: payload.environment,
          location_label: payload.location_label ?? null,
          duration_min: payload.duration_min ?? null,
          rpe: payload.rpe ?? null,
          notes: payload.notes ?? null,
          warmup_notes: payload.warmup_notes ?? null,
          discomforts: payload.discomforts ?? null,
          session_rest_sec: payload.session_rest_sec ?? null,
        })
        .eq("id", payload.session_id)
        .eq("patient_id", user.id);
      if (se) throw se;
      // Rewrite sets
      const { error: delErr } = await supabase
        .from("exercise_set_logs" as any)
        .delete()
        .eq("session_log_id", payload.session_id)
        .eq("patient_id", user.id);
      if (delErr) throw delErr;
      const rows = payload.items.flatMap((it) =>
        it.sets.map((s) => ({
          session_log_id: payload.session_id,
          exercise_id: it.exercise_id,
          patient_id: user.id,
          set_number: s.set_number,
          reps: s.reps ?? null,
          weight_kg: s.weight_kg ?? null,
          distance_m: s.distance_m ?? null,
          duration_sec: s.duration_sec ?? null,
          rest_sec: s.rest_sec ?? null,
          rpe: s.rpe ?? null,
        })),
      );
      if (rows.length) {
        const { error: setErr } = await supabase.from("exercise_set_logs" as any).insert(rows);
        if (setErr) throw setErr;
      }
      return payload.session_id;
    },
    onSuccess: () => {
      toast.success("Sesión actualizada. El Coach IA recalculará la próxima progresión.");
      qc.invalidateQueries({ queryKey: ["exercise_sessions"] });
      qc.invalidateQueries({ queryKey: ["exercise_sets_all"] });
      qc.invalidateQueries({ queryKey: ["exercise_sets_by_ex"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });
}

// Epley 1RM estimation
export function estimate1RM(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  return +(weight * (1 + reps / 30)).toFixed(1);
}
