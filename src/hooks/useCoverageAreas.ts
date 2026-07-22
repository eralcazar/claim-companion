import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CoverageArea } from "@/lib/geo/coverage";

export function useCoverageAreas(opts: { onlyActive?: boolean } = {}) {
  return useQuery({
    queryKey: ["coverage_areas", opts],
    queryFn: async () => {
      let q = (supabase as any)
        .from("coverage_areas")
        .select("*")
        .order("created_at", { ascending: false });
      if (opts.onlyActive) q = q.eq("activa", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CoverageArea[];
    },
  });
}

export function useUpsertCoverageArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<CoverageArea> & { id?: string }) => {
      const { error } = await (supabase as any).from("coverage_areas").upsert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coverage_areas"] });
      toast.success("Área guardada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

export function useDeleteCoverageArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("coverage_areas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coverage_areas"] });
      toast.success("Área eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}