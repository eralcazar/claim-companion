import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type IndicadorPunto = {
  fecha: string; // ISO date
  valor: number;
  unidad: string | null;
  ref_min: number | null;
  ref_max: number | null;
  es_normal: boolean | null;
  resultado_id: string;
  estudio_id: string;
  tipo_estudio: string | null;
};

export type TendenciaIndicador = {
  nombre: string;
  unidad: string | null;
  ref_min: number | null;
  ref_max: number | null;
  puntos: IndicadorPunto[];
};

/**
 * Devuelve, para un paciente, todos los indicadores numéricos agrupados por
 * `nombre_indicador` y ordenados por fecha del resultado, listos para graficar.
 */
export function useTendenciasPaciente(patientId?: string) {
  return useQuery({
    queryKey: ["tendencias", patientId],
    enabled: !!patientId,
    queryFn: async (): Promise<TendenciaIndicador[]> => {
      if (!patientId) return [];

      // 1. Indicadores del paciente con valor numérico.
      const { data: indicadores, error } = await supabase
        .from("indicadores_estudio")
        .select(
          "id, nombre_indicador, valor, unidad, valor_referencia_min, valor_referencia_max, es_normal, resultado_id"
        )
        .eq("patient_id", patientId)
        .not("valor", "is", null);
      if (error) throw error;
      const inds = indicadores ?? [];
      if (inds.length === 0) return [];

      // 2. Resultados → fecha + estudio.
      const resultadoIds = Array.from(new Set(inds.map((i) => i.resultado_id)));
      const { data: resultados } = await supabase
        .from("resultados_estudios")
        .select("id, fecha_resultado, created_at, estudio_id")
        .in("id", resultadoIds);
      const resMap = new Map<string, { fecha: string; estudio_id: string }>();
      for (const r of resultados ?? []) {
        resMap.set(r.id, {
          fecha: r.fecha_resultado || r.created_at,
          estudio_id: r.estudio_id,
        });
      }

      // 3. Estudios → tipo.
      const estudioIds = Array.from(new Set((resultados ?? []).map((r) => r.estudio_id)));
      let estMap = new Map<string, string>();
      if (estudioIds.length > 0) {
        const { data: estudios } = await supabase
          .from("estudios_solicitados")
          .select("id, tipo_estudio")
          .in("id", estudioIds);
        for (const e of estudios ?? []) estMap.set(e.id, e.tipo_estudio);
      }

      // 4. Agrupar por nombre normalizado.
      const grupos = new Map<string, TendenciaIndicador>();
      for (const i of inds) {
        const meta = resMap.get(i.resultado_id);
        if (!meta) continue;
        const key = i.nombre_indicador.trim().toLowerCase();
        let g = grupos.get(key);
        if (!g) {
          g = {
            nombre: i.nombre_indicador.trim(),
            unidad: i.unidad ?? null,
            ref_min: i.valor_referencia_min != null ? Number(i.valor_referencia_min) : null,
            ref_max: i.valor_referencia_max != null ? Number(i.valor_referencia_max) : null,
            puntos: [],
          };
          grupos.set(key, g);
        }
        // Mantener el rango de referencia más reciente que tengamos.
        if (g.ref_min == null && i.valor_referencia_min != null)
          g.ref_min = Number(i.valor_referencia_min);
        if (g.ref_max == null && i.valor_referencia_max != null)
          g.ref_max = Number(i.valor_referencia_max);
        if (!g.unidad && i.unidad) g.unidad = i.unidad;

        g.puntos.push({
          fecha: meta.fecha,
          valor: Number(i.valor),
          unidad: i.unidad ?? null,
          ref_min: i.valor_referencia_min != null ? Number(i.valor_referencia_min) : null,
          ref_max: i.valor_referencia_max != null ? Number(i.valor_referencia_max) : null,
          es_normal: i.es_normal,
          resultado_id: i.resultado_id,
          estudio_id: meta.estudio_id,
          tipo_estudio: estMap.get(meta.estudio_id) ?? null,
        });
      }

      // 5. Ordenar puntos por fecha asc y filtrar grupos con al menos 1 punto.
      const out = Array.from(grupos.values())
        .map((g) => ({
          ...g,
          puntos: g.puntos.sort(
            (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
          ),
        }))
        .sort((a, b) => b.puntos.length - a.puntos.length || a.nombre.localeCompare(b.nombre));

      return out;
    },
  });
}

export type IndicadorHistoryPoint = {
  fecha: string;
  valor: number;
  es_normal: boolean | null;
  ref_min: number | null;
  ref_max: number | null;
};

/**
 * Historia de un indicador específico para un paciente, ordenada cronológicamente.
 * Útil para sparklines en línea.
 */
export function useIndicadorHistory(patientId?: string, nombreIndicador?: string) {
  return useQuery({
    queryKey: ["indicador-history", patientId, nombreIndicador?.trim().toLowerCase()],
    enabled: !!patientId && !!nombreIndicador,
    staleTime: 60_000,
    queryFn: async (): Promise<IndicadorHistoryPoint[]> => {
      if (!patientId || !nombreIndicador) return [];
      const { data: inds, error } = await supabase
        .from("indicadores_estudio")
        .select(
          "valor, es_normal, valor_referencia_min, valor_referencia_max, resultado_id, nombre_indicador"
        )
        .eq("patient_id", patientId)
        .ilike("nombre_indicador", nombreIndicador.trim())
        .not("valor", "is", null);
      if (error) throw error;
      const list = inds ?? [];
      if (list.length === 0) return [];

      const resultadoIds = Array.from(new Set(list.map((i) => i.resultado_id)));
      const { data: resultados } = await supabase
        .from("resultados_estudios")
        .select("id, fecha_resultado, created_at")
        .in("id", resultadoIds);
      const fechaMap = new Map<string, string>();
      for (const r of resultados ?? []) {
        fechaMap.set(r.id, r.fecha_resultado || r.created_at);
      }

      const points: IndicadorHistoryPoint[] = list
        .map((i) => {
          const fecha = fechaMap.get(i.resultado_id);
          if (!fecha) return null;
          return {
            fecha,
            valor: Number(i.valor),
            es_normal: i.es_normal,
            ref_min: i.valor_referencia_min != null ? Number(i.valor_referencia_min) : null,
            ref_max: i.valor_referencia_max != null ? Number(i.valor_referencia_max) : null,
          } as IndicadorHistoryPoint;
        })
        .filter((p): p is IndicadorHistoryPoint => p !== null)
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

      return points;
    },
  });
}