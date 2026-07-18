import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type SavedSearch = {
  id: string;
  user_id: string;
  nombre: string;
  q: string;
  area: string;
  pais: string;
  sector: string;
  only_favs: boolean;
  last_used_at: string;
  created_at: string;
  pinned: boolean;
  sort_order: number;
};

export function toSearchParamsString(s: Pick<SavedSearch, "q" | "area" | "pais" | "sector" | "only_favs">) {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.area && s.area !== "todas") p.set("area", s.area);
  if (s.pais && s.pais !== "todos") p.set("pais", s.pais);
  if (s.sector && s.sector !== "todos") p.set("sector", s.sector);
  if (s.only_favs) p.set("favs", "1");
  const s2 = p.toString();
  return s2 ? `?${s2}` : "";
}

export function useSavedSearches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-searches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("especialidad_busquedas" as any)
        .select("*")
        .order("pinned", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("last_used_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavedSearch[];
    },
  });
}

export function useSaveSearch() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<SavedSearch, "id" | "user_id" | "created_at" | "last_used_at">) => {
      if (!user) throw new Error("No auth");
      const { error } = await supabase.from("especialidad_busquedas" as any).upsert(
        {
          user_id: user.id,
          nombre: payload.nombre,
          q: payload.q ?? "",
          area: payload.area ?? "todas",
          pais: payload.pais ?? "todos",
          sector: payload.sector ?? "todos",
          only_favs: !!payload.only_favs,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,nombre" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Búsqueda guardada");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });
}

export function useTouchSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("especialidad_busquedas" as any)
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-searches"] }),
  });
}

export function useDeleteSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("especialidad_busquedas" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Búsqueda eliminada");
    },
  });
}

export function useRenameSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: string }) => {
      const trimmed = nombre.trim();
      if (!trimmed) throw new Error("El nombre no puede estar vacío");
      const { error } = await supabase
        .from("especialidad_busquedas" as any)
        .update({ nombre: trimmed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Búsqueda renombrada");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo renombrar"),
  });
}

export function useTogglePinSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase
        .from("especialidad_busquedas" as any)
        .update({ pinned })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-searches"] }),
  });
}

export function useReorderSavedSearches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from("especialidad_busquedas" as any).update({ sort_order: idx }).eq("id", id),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-searches"] }),
  });
}