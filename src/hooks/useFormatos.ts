import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Aseguradora = {
  id: string;
  nombre: string;
  slug: string;
  carpeta_storage: string;
  color_primario: string;
  activa: boolean;
};

export type Formulario = {
  id: string;
  aseguradora_id: string;
  nombre: string;
  nombre_display: string;
  storage_path: string;
  total_paginas: number;
  total_campos_estimado: number;
  activo: boolean;
};

export type Campo = {
  id: string;
  formulario_id: string;
  seccion_id: string | null;
  clave: string;
  etiqueta: string | null;
  descripcion: string | null;
  origen: string;
  tipo: string;
  campo_pagina: number | null;
  campo_x: number | null;
  campo_y: number | null;
  campo_ancho: number | null;
  campo_alto: number | null;
  label_pagina: number | null;
  label_x: number | null;
  label_y: number | null;
  label_ancho: number | null;
  label_alto: number | null;
  mapeo_perfil: string | null;
  mapeo_poliza: string | null;
  mapeo_siniestro: string | null;
  mapeo_medico: string | null;
  requerido: boolean;
  longitud_max: number | null;
  patron_validacion: string | null;
  valor_defecto: string | null;
  opciones: any;
  orden: number;
};

export type Seccion = {
  id: string;
  formulario_id: string;
  nombre: string;
  orden: number;
  pagina: number;
};

export type Mapeo = {
  id: string;
  nombre_display: string;
  columna_origen: string;
  tipo: string;
};

export function useAseguradoras() {
  return useQuery({
    queryKey: ["aseguradoras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aseguradoras")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return data as Aseguradora[];
    },
  });
}

export function useFormularios() {
  return useQuery({
    queryKey: ["formularios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formularios")
        .select("*")
        .order("nombre_display");
      if (error) throw error;
      return data as Formulario[];
    },
  });
}

export function useCampos(formularioId: string | null) {
  return useQuery({
    queryKey: ["campos", formularioId],
    enabled: !!formularioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campos")
        .select("*")
        .eq("formulario_id", formularioId!)
        .order("orden");
      if (error) throw error;
      return data as Campo[];
    },
  });
}

export function useSecciones(formularioId: string | null) {
  return useQuery({
    queryKey: ["secciones", formularioId],
    enabled: !!formularioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secciones")
        .select("*")
        .eq("formulario_id", formularioId!)
        .order("orden");
      if (error) throw error;
      return data as Seccion[];
    },
  });
}

export function useMapeos() {
  return useQuery({
    queryKey: ["mapeos"],
    queryFn: async () => {
      const [perfiles, polizas, siniestros, medicos] = await Promise.all([
        supabase.from("mapeo_perfiles").select("*").order("nombre_display"),
        supabase.from("mapeo_polizas").select("*").order("nombre_display"),
        supabase.from("mapeo_siniestros").select("*").order("nombre_display"),
        supabase.from("mapeo_medicos" as any).select("*").order("nombre_display"),
      ]);
      if (perfiles.error) throw perfiles.error;
      if (polizas.error) throw polizas.error;
      if (siniestros.error) throw siniestros.error;
      if (medicos.error) throw medicos.error;
      return {
        perfiles: perfiles.data as Mapeo[],
        polizas: polizas.data as Mapeo[],
        siniestros: siniestros.data as Mapeo[],
        medicos: ((medicos.data ?? []) as unknown) as Mapeo[],
      };
    },
  });
}

export function useUpsertCampos(formularioId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campos: Partial<Campo>[]) => {
      const { error } = await supabase.from("campos").upsert(campos as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campos", formularioId] });
      toast.success("Campos guardados");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
}

/**
 * Silent variant for live drag/resize updates. No success toast, only errors.
 */
export function useUpdateCampoSilent(formularioId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campo: Partial<Campo> & { id: string }) => {
      const { error } = await supabase
        .from("campos")
        .update(campo)
        .eq("id", campo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campos", formularioId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar coordenadas"),
  });
}

export function useDeleteCampo(formularioId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campos", formularioId] });
      toast.success("Campo eliminado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

export function useBulkDeleteCampos(formularioId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return 0;
      const { error } = await supabase.from("campos").delete().in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["campos", formularioId] });
      if (n) toast.success(`${n} campos eliminados`);
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

export function useUpsertSeccion(formularioId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seccion: Partial<Seccion>) => {
      const { error } = await supabase.from("secciones").upsert(seccion as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["secciones", formularioId] });
      toast.success("Sección guardada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
}

export function useDeleteSeccion(formularioId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("secciones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["secciones", formularioId] });
      toast.success("Sección eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

export function useBulkDeleteSecciones(formularioId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return 0;
      const { error } = await supabase.from("secciones").delete().in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["secciones", formularioId] });
      if (n) toast.success(`${n} secciones eliminadas`);
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

export function useUpdateFormulario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: Partial<Formulario> & { id: string }) => {
      const { error } = await supabase
        .from("formularios")
        .update(form)
        .eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["formularios"] });
      toast.success("Formulario actualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al actualizar"),
  });
}

export function getFormatoPublicUrl(storagePath: string) {
  // storage_path stored like "formatos/ALLIANZ/informe_medico.pdf" — strip bucket prefix
  const path = storagePath.replace(/^formatos\//, "");
  const { data } = supabase.storage.from("formatos").getPublicUrl(path);
  return data.publicUrl;
}