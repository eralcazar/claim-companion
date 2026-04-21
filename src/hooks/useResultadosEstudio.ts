import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useResultados(estudioId?: string) {
  return useQuery({
    queryKey: ["resultados", estudioId],
    queryFn: async () => {
      if (!estudioId) return [];
      const { data, error } = await supabase
        .from("resultados_estudios")
        .select("*")
        .eq("estudio_id", estudioId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!estudioId,
  });
}

export function useUploadResultado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      estudioId, patientId, file, uploadedBy, fechaResultado, laboratorio, notas,
    }: { estudioId: string; patientId: string; file: File; uploadedBy: string; fechaResultado?: string; laboratorio?: string; notas?: string }) => {
      const path = `${patientId}/${estudioId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("estudios-resultados").upload(path, file);
      if (upErr) throw upErr;
      const { data, error } = await supabase.from("resultados_estudios").insert({
        estudio_id: estudioId,
        patient_id: patientId,
        pdf_path: path,
        pdf_name: file.name,
        fecha_resultado: fechaResultado || null,
        laboratorio_nombre: laboratorio || null,
        notas: notas || null,
        uploaded_by: uploadedBy,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resultados"] });
      toast.success("Resultado subido");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al subir resultado"),
  });
}

export function useDeleteResultado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      await supabase.storage.from("estudios-resultados").remove([path]);
      const { error } = await supabase.from("resultados_estudios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resultados"] });
      toast.success("Resultado eliminado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

export function useDownloadResultado() {
  return useMutation({
    mutationFn: async (path: string) => {
      const { data, error } = await supabase.storage.from("estudios-resultados").createSignedUrl(path, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al descargar"),
  });
}

export function useIndicadores(resultadoId?: string) {
  return useQuery({
    queryKey: ["indicadores", resultadoId],
    queryFn: async () => {
      if (!resultadoId) return [];
      const { data, error } = await supabase
        .from("indicadores_estudio")
        .select("*")
        .eq("resultado_id", resultadoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!resultadoId,
  });
}

export function useSaveIndicador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      if (input.id) {
        const { id, ...patch } = input;
        const { error } = await supabase.from("indicadores_estudio").update(patch).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("indicadores_estudio").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["indicadores"] }),
    onError: (e: any) => toast.error(e.message ?? "Error al guardar indicador"),
  });
}

export function useDeleteIndicador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("indicadores_estudio").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["indicadores"] }),
  });
}

export function useDeleteIndicadoresByResultado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (resultadoId: string) => {
      const { error } = await supabase
        .from("indicadores_estudio")
        .delete()
        .eq("resultado_id", resultadoId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["indicadores"] }),
  });
}

export function useExtractIndicators() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (resultadoId: string) => {
      const { data, error } = await supabase.functions.invoke("extract-study-indicators", {
        body: { resultado_id: resultadoId },
      });
      if (error) {
        // Try to surface the function's JSON error message
        const ctx: any = (error as any).context;
        let msg = error.message;
        try {
          if (ctx && typeof ctx.json === "function") {
            const j = await ctx.json();
            if (j?.error) msg = j.error;
          }
        } catch {}
        throw new Error(msg);
      }
      return data as { inserted: number; meta?: any };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["indicadores"] });
      qc.invalidateQueries({ queryKey: ["resultados"] });
      toast.success(`${data.inserted ?? 0} indicadores extraídos con IA`);
    },
    onError: (e: any) => {
      const msg = e?.message ?? "Error al extraer indicadores";
      toast.error(msg);
    },
  });
}
