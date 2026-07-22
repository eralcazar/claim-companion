import { useMemo } from "react";

export type SyncStatus = "ok" | "stale" | "empty";

export type MonitorAlert = {
  id: string;
  severity: "warning" | "info";
  title: string;
  detail: string;
  steps: string[];
};

export type MonitorHealthInput = {
  /** Cada punto = { fecha: 'YYYY-MM-DD', value: number, source?: string } */
  points: Array<{ fecha: string; value: number; source?: string | null }>;
  rangeDays: number;
  /** rangos clínicos opcionales para outliers duros */
  hardLow?: number;
  hardHigh?: number;
  label: string; // "pasos", "sueño", "frecuencia cardíaca"
  unit: string;
};

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
}

export function useMonitorHealth(input: MonitorHealthInput) {
  return useMemo(() => {
    const { points, rangeDays, hardLow, hardHigh, label, unit } = input;
    const alerts: MonitorAlert[] = [];
    const sorted = [...points].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const lastReadingAt = sorted.length ? sorted[sorted.length - 1].fecha : null;

    // Estado de sincronización
    let syncStatus: SyncStatus = "ok";
    if (!sorted.length) {
      syncStatus = "empty";
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const gapToday = daysBetween(lastReadingAt!, today);
      if (gapToday >= 3) syncStatus = "stale";
    }

    // Sin datos
    if (!sorted.length) {
      alerts.push({
        id: "empty",
        severity: "warning",
        title: `Sin lecturas de ${label} en los últimos ${rangeDays} días`,
        detail: "No encontramos datos en el rango seleccionado.",
        steps: [
          "Ampliá el rango de fechas (por ejemplo 30 o 90 días).",
          "Verificá que tu dispositivo esté emparejado y sincronizado.",
          "Tocá 'Reintentar' para forzar una sincronización.",
        ],
      });
    }

    // Gap grande entre lecturas
    if (sorted.length >= 2) {
      for (let i = 1; i < sorted.length; i++) {
        const gap = daysBetween(sorted[i - 1].fecha, sorted[i].fecha);
        if (gap >= 3) {
          alerts.push({
            id: `gap-${sorted[i - 1].fecha}`,
            severity: "info",
            title: `Faltan ${gap - 1} días entre ${sorted[i - 1].fecha} y ${sorted[i].fecha}`,
            detail: `Es posible que el dispositivo no haya subido datos en ese periodo.`,
            steps: [
              "Abrí la app del wearable y sincronizá manualmente.",
              "Confirmá que Health Connect / Apple Salud tenga permisos activos.",
            ],
          });
          if (alerts.length > 4) break;
        }
      }
    }

    // Valores atípicos (z-score sobre media móvil de 14 puntos)
    if (sorted.length >= 7) {
      const values = sorted.map((p) => p.value);
      const mean = values.reduce((a, v) => a + v, 0) / values.length;
      const std = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length) || 1;
      const outliers = sorted.filter((p) => Math.abs((p.value - mean) / std) > 2.5);
      if (outliers.length) {
        alerts.push({
          id: "outlier",
          severity: "warning",
          title: `${outliers.length} valor(es) atípico(s) detectado(s)`,
          detail: `Últimos días con lecturas fuera del patrón habitual (promedio ${Math.round(mean)} ${unit}).`,
          steps: [
            "Revisá si el dispositivo estuvo bien colocado ese día.",
            "Considerá etiquetar la lectura como 'evento' si fue una situación puntual.",
            "Si se repite, comentálo con tu profesional de salud.",
          ],
        });
      }
    }

    // Rangos clínicos duros
    if ((hardLow != null || hardHigh != null) && sorted.length) {
      const bad = sorted.filter((p) =>
        (hardLow != null && p.value < hardLow) || (hardHigh != null && p.value > hardHigh));
      if (bad.length) {
        alerts.push({
          id: "clinical",
          severity: "warning",
          title: `${bad.length} lectura(s) fuera de rango clínico`,
          detail: `Rango de referencia: ${hardLow ?? "-"}–${hardHigh ?? "-"} ${unit}.`,
          steps: [
            "Confirmá el valor con una segunda toma.",
            "Si el patrón se sostiene, comparte el reporte con tu profesional.",
          ],
        });
      }
    }

    return { syncStatus, lastReadingAt, alerts };
  }, [input]);
}