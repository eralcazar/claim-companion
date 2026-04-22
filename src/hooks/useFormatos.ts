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
  es_informe_medico?: boolean;
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

export function useImportSecciones(formularioId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Array<{ nombre: string; orden: number; pagina: number }>) => {
      if (!formularioId) throw new Error("Sin formulario");
      if (rows.length === 0) return { inserted: 0, updated: 0 };

      const { data: existing, error: exErr } = await supabase
        .from("secciones")
        .select("id, nombre")
        .eq("formulario_id", formularioId);
      if (exErr) throw exErr;

      const byName = new Map((existing ?? []).map((s) => [s.nombre.toLowerCase(), s.id]));
      const payload = rows.map((r) => {
        const existId = byName.get(r.nombre.toLowerCase());
        return existId
          ? { id: existId, formulario_id: formularioId, nombre: r.nombre, orden: r.orden, pagina: r.pagina }
          : { formulario_id: formularioId, nombre: r.nombre, orden: r.orden, pagina: r.pagina };
      });

      const inserted = payload.filter((p) => !("id" in p)).length;
      const updated = payload.length - inserted;
      const { error } = await supabase.from("secciones").upsert(payload as any);
      if (error) throw error;
      return { inserted, updated };
    },
    onSuccess: ({ inserted, updated }) => {
      qc.invalidateQueries({ queryKey: ["secciones", formularioId] });
      toast.success(`Importadas: ${inserted} nuevas, ${updated} actualizadas`);
    },
    onError: (e: any) => toast.error(e.message ?? "Error al importar"),
  });
}

export type CampoImportRow = {
  clave: string;
  etiqueta: string;
  tipo: string;
  seccion_nombre?: string | null;
  pagina?: number | null;
  requerido?: boolean;
  longitud_max?: number | null;
  opciones?: string[] | null;
  mapeo_perfil?: string | null;
  mapeo_poliza?: string | null;
  mapeo_siniestro?: string | null;
  mapeo_medico?: string | null;
  campo_x?: number | null;
  campo_y?: number | null;
  campo_ancho?: number | null;
  campo_alto?: number | null;
};

export function useImportCampos(formularioId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: CampoImportRow[]) => {
      if (!formularioId) throw new Error("Sin formulario");
      if (rows.length === 0) return { inserted: 0, sectionsCreated: 0 };

      // Resolve section names → ids (create missing)
      const { data: existingSecs, error: secErr } = await supabase
        .from("secciones")
        .select("id, nombre, pagina")
        .eq("formulario_id", formularioId);
      if (secErr) throw secErr;
      const secByName = new Map(
        (existingSecs ?? []).map((s) => [s.nombre.toLowerCase(), s.id]),
      );

      const neededNames = new Set<string>();
      rows.forEach((r) => {
        if (r.seccion_nombre && !secByName.has(r.seccion_nombre.toLowerCase())) {
          neededNames.add(r.seccion_nombre);
        }
      });

      let sectionsCreated = 0;
      if (neededNames.size > 0) {
        const newSecs = Array.from(neededNames).map((nombre, i) => ({
          formulario_id: formularioId,
          nombre,
          orden: (existingSecs?.length ?? 0) + i,
          pagina: 1,
        }));
        const { data: created, error: cErr } = await supabase
          .from("secciones")
          .insert(newSecs)
          .select("id, nombre");
        if (cErr) throw cErr;
        (created ?? []).forEach((s) => secByName.set(s.nombre.toLowerCase(), s.id));
        sectionsCreated = created?.length ?? 0;
      }

      // Get current max orden
      const { data: maxRow } = await supabase
        .from("campos")
        .select("orden")
        .eq("formulario_id", formularioId)
        .order("orden", { ascending: false })
        .limit(1);
      let nextOrden = (maxRow?.[0]?.orden ?? -1) + 1;

      const payload = rows.map((r) => ({
        formulario_id: formularioId,
        clave: r.clave,
        etiqueta: r.etiqueta,
        tipo: r.tipo,
        seccion_id: r.seccion_nombre
          ? secByName.get(r.seccion_nombre.toLowerCase()) ?? null
          : null,
        campo_pagina: r.pagina ?? 1,
        requerido: r.requerido ?? false,
        longitud_max: r.longitud_max ?? null,
        opciones: r.opciones && r.opciones.length > 0 ? r.opciones : null,
        mapeo_perfil: r.mapeo_perfil ?? null,
        mapeo_poliza: r.mapeo_poliza ?? null,
        mapeo_siniestro: r.mapeo_siniestro ?? null,
        mapeo_medico: r.mapeo_medico ?? null,
        campo_x: r.campo_x ?? null,
        campo_y: r.campo_y ?? null,
        campo_ancho: r.campo_ancho ?? null,
        campo_alto: r.campo_alto ?? null,
        origen: "csv_import",
        orden: nextOrden++,
      }));

      const { error } = await supabase.from("campos").insert(payload as any);
      if (error) throw error;
      return { inserted: payload.length, sectionsCreated };
    },
    onSuccess: ({ inserted, sectionsCreated }) => {
      qc.invalidateQueries({ queryKey: ["campos", formularioId] });
      qc.invalidateQueries({ queryKey: ["secciones", formularioId] });
      const extra = sectionsCreated > 0 ? ` (+${sectionsCreated} secciones nuevas)` : "";
      toast.success(`Importados ${inserted} campos${extra}`);
    },
    onError: (e: any) => toast.error(e.message ?? "Error al importar"),
  });
}

export function getFormatoPublicUrl(storagePath: string) {
  // storage_path stored like "formatos/ALLIANZ/informe_medico.pdf" — strip bucket prefix
  const path = storagePath.replace(/^formatos\//, "");
  const { data } = supabase.storage.from("formatos").getPublicUrl(path);
  return data.publicUrl;
}