import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ActivityGoals = {
  id?: string;
  patient_id?: string;
  steps_goal: number;
  active_minutes_goal: number;
  sleep_minutes_goal: number;
  calories_goal: number;
  resting_hr: number | null;
  max_hr: number | null;
};

const DEFAULT_GOALS: ActivityGoals = {
  steps_goal: 8000,
  active_minutes_goal: 30,
  sleep_minutes_goal: 420,
  calories_goal: 2000,
  resting_hr: null,
  max_hr: null,
};

export function useActivityGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["activity-goals", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ActivityGoals> => {
      const { data, error } = await supabase
        .from("activity_goals")
        .select("*")
        .eq("patient_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as ActivityGoals | null) ?? DEFAULT_GOALS;
    },
  });
}

export function useUpsertActivityGoals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goals: Partial<ActivityGoals>) => {
      if (!user?.id) throw new Error("Sin sesión");
      const payload = { patient_id: user.id, ...goals };
      const { error } = await supabase
        .from("activity_goals")
        .upsert(payload, { onConflict: "patient_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity-goals"] });
      toast.success("Metas actualizadas");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al guardar metas"),
  });
}

export type WorkoutPlan = {
  id: string;
  patient_id: string;
  name: string;
  objective: string;
  level: string;
  days_per_week: number;
  notes: string | null;
  is_active: boolean;
  ai_generated: boolean;
  created_at: string;
};

export function useWorkoutPlans() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["workout-plans", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<WorkoutPlan[]> => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkoutPlan[];
    },
  });
}

export function useCreateWorkoutPlan() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      objective: string;
      level: string;
      days_per_week: number;
      notes?: string;
      ai_generated?: boolean;
    }) => {
      if (!user?.id) throw new Error("Sin sesión");
      const { data, error } = await supabase
        .from("workout_plans")
        .insert({
          patient_id: user.id,
          created_by: user.id,
          ...input,
        } as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as WorkoutPlan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout-plans"] });
      toast.success("Plan creado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al crear plan"),
  });
}

export function useDeleteWorkoutPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout-plans"] });
      qc.invalidateQueries({ queryKey: ["workout-sessions"] });
      toast.success("Plan eliminado");
    },
  });
}

export type WorkoutSession = {
  id: string;
  plan_id: string;
  day_of_week: number;
  orden: number;
  title: string;
  duration_min: number | null;
  intensity: string | null;
  notes: string | null;
};

export function useWorkoutSessions(planId?: string) {
  return useQuery({
    queryKey: ["workout-sessions", planId],
    enabled: !!planId,
    queryFn: async (): Promise<WorkoutSession[]> => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("plan_id", planId!)
        .order("day_of_week", { ascending: true })
        .order("orden", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkoutSession[];
    },
  });
}

export function useCreateWorkoutSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      plan_id: string;
      day_of_week: number;
      title: string;
      duration_min?: number;
      intensity?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert(input)
        .select("*")
        .single();
      if (error) throw error;
      return data as WorkoutSession;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["workout-sessions", vars.plan_id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al crear sesión"),
  });
}

export function useDeleteWorkoutSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout-sessions"] });
      qc.invalidateQueries({ queryKey: ["workout-exercises"] });
    },
  });
}

export type WorkoutExercise = {
  id: string;
  session_id: string;
  orden: number;
  name: string;
  muscle_group: string | null;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  equipment: string | null;
  video_url: string | null;
  notes: string | null;
};

export function useWorkoutExercises(sessionId?: string) {
  return useQuery({
    queryKey: ["workout-exercises", sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<WorkoutExercise[]> => {
      const { data, error } = await supabase
        .from("workout_exercises")
        .select("*")
        .eq("session_id", sessionId!)
        .order("orden", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkoutExercise[];
    },
  });
}

export function useAddExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<WorkoutExercise> & { session_id: string; name: string }) => {
      const { data, error } = await supabase
        .from("workout_exercises")
        .insert(input as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as WorkoutExercise;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["workout-exercises", vars.session_id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al agregar ejercicio"),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workout-exercises"] }),
  });
}

export type WorkoutLog = {
  id: string;
  patient_id: string;
  session_id: string | null;
  plan_id: string | null;
  fecha: string;
  completed: boolean;
  rpe: number | null;
  duration_min: number | null;
  hr_avg: number | null;
  notes: string | null;
};

export function useWorkoutLogs(days = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["workout-logs", user?.id, days],
    enabled: !!user?.id,
    queryFn: async (): Promise<WorkoutLog[]> => {
      const from = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("patient_id", user!.id)
        .gte("fecha", from)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkoutLog[];
    },
  });
}

export function useLogWorkout() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      session_id?: string;
      plan_id?: string;
      completed?: boolean;
      rpe?: number;
      duration_min?: number;
      hr_avg?: number;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error("Sin sesión");
      const { error } = await supabase.from("workout_logs").insert({
        patient_id: user.id,
        completed: input.completed ?? true,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout-logs"] });
      toast.success("Entrenamiento registrado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al registrar"),
  });
}

export type ActivitySuggestion = {
  id: string;
  patient_id: string;
  summary: string | null;
  red_flags: any[];
  recommendations: any[];
  suggested_plan: any | null;
  model: string | null;
  tokens_used: number;
  applied_plan_id: string | null;
  created_at: string;
};

export function useActivitySuggestions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["activity-ai-suggestions", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ActivitySuggestion[]> => {
      const { data, error } = await supabase
        .from("activity_ai_suggestions")
        .select("*")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ActivitySuggestion[];
    },
  });
}

export function useGenerateAiCoach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-activity-coach", {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity-ai-suggestions"] });
      qc.invalidateQueries({ queryKey: ["kari-balance"] });
      toast.success("Sugerencia generada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al generar sugerencia"),
  });
}

export function useApplySuggestion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (suggestion: ActivitySuggestion) => {
      if (!user?.id) throw new Error("Sin sesión");
      const plan = suggestion.suggested_plan;
      if (!plan) throw new Error("La sugerencia no incluye plan");

      const { data: created, error: pErr } = await supabase
        .from("workout_plans")
        .insert({
          patient_id: user.id,
          created_by: user.id,
          name: plan.name ?? "Plan sugerido por IA",
          objective: plan.objective ?? "mantenimiento",
          level: plan.level ?? "principiante",
          days_per_week: plan.days_per_week ?? 3,
          notes: plan.notes ?? null,
          ai_generated: true,
        })
        .select("*")
        .single();
      if (pErr) throw pErr;

      const sessions: any[] = Array.isArray(plan.sessions) ? plan.sessions : [];
      for (const s of sessions) {
        const { data: sess, error: sErr } = await supabase
          .from("workout_sessions")
          .insert({
            plan_id: created.id,
            day_of_week: Number(s.day_of_week ?? 1),
            title: s.title ?? "Sesión",
            duration_min: s.duration_min ?? null,
            intensity: s.intensity ?? null,
            notes: s.notes ?? null,
          })
          .select("id")
          .single();
        if (sErr) continue;
        const exs: any[] = Array.isArray(s.exercises) ? s.exercises : [];
        for (const [i, ex] of exs.entries()) {
          await supabase.from("workout_exercises").insert({
            session_id: sess.id,
            orden: i,
            name: ex.name ?? "Ejercicio",
            muscle_group: ex.muscle_group ?? null,
            sets: ex.sets ?? null,
            reps: ex.reps ?? null,
            duration_seconds: ex.duration_seconds ?? null,
            rest_seconds: ex.rest_seconds ?? null,
            equipment: ex.equipment ?? null,
            notes: ex.notes ?? null,
          });
        }
      }

      await supabase
        .from("activity_ai_suggestions")
        .update({ applied_plan_id: created.id })
        .eq("id", suggestion.id);

      return created as WorkoutPlan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout-plans"] });
      qc.invalidateQueries({ queryKey: ["activity-ai-suggestions"] });
      toast.success("Plan aplicado a tu biblioteca");
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al aplicar plan"),
  });
}