import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type HomeVisitReview = {
  id: string;
  visit_id: string;
  patient_id: string;
  doctor_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

export function useVisitReview(visitId: string | null | undefined) {
  return useQuery({
    queryKey: ["home_visit_review", visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_visit_reviews" as any)
        .select("*")
        .eq("visit_id", visitId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as HomeVisitReview | null;
    },
  });
}

export function useCreateVisitReview() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ visit_id, doctor_id, rating, comment }: { visit_id: string; doctor_id: string | null; rating: number; comment?: string }) => {
      const { error } = await supabase.from("home_visit_reviews" as any).insert({
        visit_id,
        patient_id: user!.id,
        doctor_id,
        rating,
        comment: comment || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["home_visit_review", v.visit_id] });
      toast.success("¡Gracias por tu reseña!");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}
