import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Firma = {
  id: string;
  user_id: string;
  nombre: string;
  imagen_base64: string;
  es_predeterminada: boolean;
  created_at: string;
  updated_at: string;
};

export function useFirmas(userId: string | undefined | null) {
  return useQuery({
    queryKey: ["firmas", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firmas_usuario" as any)
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Firma[];
    },
  });
}

export function useFirmaById(id: string | undefined | null) {
  return useQuery({
    queryKey: ["firma", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firmas_usuario" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Firma | null;
    },
  });
}

export function useCreateFirma(userId: string | undefined | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nombre: string; imagen_base64: string; es_predeterminada?: boolean }) => {
      if (!userId) throw new Error("Sin usuario");
      // Si va a ser predeterminada, desmarca las demás primero
      if (input.es_predeterminada) {
        await supabase
          .from("firmas_usuario" as any)
          .update({ es_predeterminada: false })
          .eq("user_id", userId)
          .eq("es_predeterminada", true);
      }
      const { error } = await supabase.from("firmas_usuario" as any).insert({
        user_id: userId,
        nombre: input.nombre,
        imagen_base64: input.imagen_base64,
        es_predeterminada: !!input.es_predeterminada,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firmas", userId] });
      toast.success("Firma guardada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar firma"),
  });
}

export function useUpdateFirma(userId: string | undefined | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; nombre?: string }) => {
      const patch: any = {};
      if (input.nombre !== undefined) patch.nombre = input.nombre;
      const { error } = await supabase
        .from("firmas_usuario" as any)
        .update(patch)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firmas", userId] });
      toast.success("Firma actualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al actualizar"),
  });
}

export function useDeleteFirma(userId: string | undefined | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("firmas_usuario" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firmas", userId] });
      toast.success("Firma eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

export function useSetFirmaPredeterminada(userId: string | undefined | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Sin usuario");
      // Desmarca las demás
      await supabase
        .from("firmas_usuario" as any)
        .update({ es_predeterminada: false })
        .eq("user_id", userId);
      // Marca esta
      const { error } = await supabase
        .from("firmas_usuario" as any)
        .update({ es_predeterminada: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firmas", userId] });
      toast.success("Firma predeterminada actualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al marcar predeterminada"),
  });
}