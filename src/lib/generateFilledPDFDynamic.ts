import { supabase } from "@/integrations/supabase/client";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Campo, Seccion } from "@/hooks/useFormatos";
import { getPDFFromStorage } from "@/lib/generateFilledPDF";

const CHECK = "X";

export interface DynamicPipelineCtx {
  formularioStoragePath: string;
  campos: Campo[];
  data: Record<string, any>;
  /** Firma elegida para los campos tipo='firma' (PNG dataURL) */
  firmaDataUrl?: string | null;
}

/**
 * Convierte porcentaje (0-100) a puntos PDF según el tamaño de la página.
 * Las coordenadas guardadas en `campos` están en %, con origen top-left.
 * pdf-lib usa origen bottom-left, así que invertimos Y.
 */
function pctToPoints(page: any, xPct: number, yPct: number, wPct?: number, hPct?: number) {
  const { width, height } = page.getSize();
  const x = (xPct / 100) * width;
  const w = wPct != null ? (wPct / 100) * width : 0;
  const h = hPct != null ? (hPct / 100) * height : 0;
  // Y en % desde top → puntos desde bottom
  const y = height - (yPct / 100) * height - h;
  return { x, y, w, h, pageWidth: width, pageHeight: height };
}

function safeText(v: any): string {
  if (v == null) return "";
  return String(v)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x00-\xFF]/g, "");
}

/**
 * Genera el PDF llenado a partir de la definición DB (campos + opciones + tipo='firma').
 * - texto/numero/fecha/etc. → drawText con valor de data[clave]
 * - radio → estampa "X" sólo en la opción cuyo `valor === data[clave]`
 * - checkbox (multi) → estampa "X" en cada opción incluida en data[clave] (array)
 * - checkbox simple (1 opción) → "X" si data[clave] truthy
 * - firma → embed PNG en las coordenadas del campo
 */
export async function generateFilledPDFDynamic(ctx: DynamicPipelineCtx): Promise<Uint8Array> {
  const { formularioStoragePath, campos, data, firmaDataUrl } = ctx;

  // storage_path puede venir como "formatos/METLIFE/reembolso.pdf" o "METLIFE/reembolso.pdf"
  const path = formularioStoragePath.replace(/^formatos\//, "");
  const pdfBytes = await getPDFFromStorage(path);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  // Cache de la firma embebida (se reutiliza si hay múltiples campos firma)
  let firmaImg: any = null;
  if (firmaDataUrl) {
    try {
      const b64 = firmaDataUrl.split(",")[1] || firmaDataUrl;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      firmaImg = await pdfDoc.embedPng(bytes);
    } catch (e) {
      console.warn("[dynamic] error embebiendo firma:", e);
    }
  }

  for (const c of campos) {
    const pageIdx = (c.campo_pagina ?? 1) - 1;
    const page = pages[pageIdx];
    if (!page) continue;

    const value = data[c.clave];

    // ── FIRMA ─────────────────────────────────────────────
    if (c.tipo === "firma") {
      if (!firmaImg) continue;
      if (c.campo_x == null || c.campo_y == null) continue;
      const { x, y, w, h } = pctToPoints(
        page,
        c.campo_x,
        c.campo_y,
        c.campo_ancho ?? 15,
        c.campo_alto ?? 5
      );
      try {
        page.drawImage(firmaImg, { x, y, width: w || 80, height: h || 30 });
      } catch (e) {
        console.warn("[dynamic] no se pudo dibujar firma", c.clave, e);
      }
      continue;
    }

    // ── RADIO: estampa "X" en la opción seleccionada ──────
    if (c.tipo === "radio") {
      const opciones: any[] = Array.isArray(c.opciones) ? c.opciones : [];
      for (const op of opciones) {
        if (op?.valor !== value) continue;
        if (op.campo_x == null || op.campo_y == null) continue;
        const opPage = pages[(op.campo_pagina ?? c.campo_pagina ?? 1) - 1];
        if (!opPage) continue;
        const { x, y } = pctToPoints(opPage, op.campo_x, op.campo_y, op.campo_ancho, op.campo_alto);
        try {
          opPage.drawText(CHECK, { x, y, size: 8, font, color: rgb(0, 0, 0) });
        } catch (e) { console.warn("[dynamic] radio draw error", e); }
      }
      continue;
    }

    // ── CHECKBOX ──────────────────────────────────────────
    if (c.tipo === "checkbox") {
      const opciones: any[] = Array.isArray(c.opciones) ? c.opciones : [];
      // 1 opción → boolean
      if (opciones.length <= 1) {
        if (!value) continue;
        if (c.campo_x == null || c.campo_y == null) continue;
        const { x, y } = pctToPoints(page, c.campo_x, c.campo_y, c.campo_ancho, c.campo_alto);
        try {
          page.drawText(CHECK, { x, y, size: 8, font, color: rgb(0, 0, 0) });
        } catch (e) { console.warn("[dynamic] checkbox draw error", e); }
        continue;
      }
      // multi-select
      const arr: string[] = Array.isArray(value) ? value : [];
      for (const op of opciones) {
        if (!arr.includes(op?.valor)) continue;
        if (op.campo_x == null || op.campo_y == null) continue;
        const opPage = pages[(op.campo_pagina ?? c.campo_pagina ?? 1) - 1];
        if (!opPage) continue;
        const { x, y } = pctToPoints(opPage, op.campo_x, op.campo_y, op.campo_ancho, op.campo_alto);
        try {
          opPage.drawText(CHECK, { x, y, size: 8, font, color: rgb(0, 0, 0) });
        } catch (e) { console.warn("[dynamic] checkbox multi draw error", e); }
      }
      continue;
    }

    // ── TEXTO / NUMERO / FECHA / etc. ─────────────────────
    if (value == null || value === "") continue;
    if (c.campo_x == null || c.campo_y == null) continue;
    const { x, y, w } = pctToPoints(page, c.campo_x, c.campo_y, c.campo_ancho, c.campo_alto);
    const text = safeText(typeof value === "boolean" ? (value ? "Sí" : "No") : value);
    try {
      page.drawText(text, {
        x,
        y,
        size: 8,
        font,
        color: rgb(0, 0, 0),
        maxWidth: w || undefined,
      });
    } catch (e) { console.warn("[dynamic] text draw error", c.clave, e); }
  }

  return pdfDoc.save();
}

/**
 * Resuelve el `formulario` configurado en BD para una combinación
 * (insurer slug/nombre, tramite/nombre del archivo). Devuelve null si no existe.
 *
 * Estrategia: busca aseguradora por nombre o slug ignore-case, luego un formulario
 * cuyo `nombre` o `storage_path` haga match con el formatId/file.
 */
export async function findFormularioByInsurerAndTramite(
  insurer: string,
  formatId: string
): Promise<{
  formulario: { id: string; storage_path: string; nombre: string } | null;
  campos: Campo[];
  secciones: Seccion[];
}> {
  const ins = (insurer || "").toUpperCase();

  // 1) aseguradora
  const { data: aseg } = await supabase
    .from("aseguradoras")
    .select("id,nombre,slug,carpeta_storage")
    .or(`nombre.ilike.${ins},slug.ilike.${ins.toLowerCase()}`)
    .maybeSingle();
  if (!aseg) return { formulario: null, campos: [], secciones: [] };

  // 2) formulario que coincida con formatId en su nombre o storage_path
  const { data: forms } = await supabase
    .from("formularios")
    .select("id,storage_path,nombre,activo")
    .eq("aseguradora_id", aseg.id)
    .eq("activo", true);

  const found = (forms ?? []).find((f) => {
    const lp = (f.storage_path || "").toLowerCase();
    const ln = (f.nombre || "").toLowerCase();
    return lp.includes(formatId.toLowerCase()) || ln.includes(formatId.toLowerCase());
  });
  if (!found) return { formulario: null, campos: [], secciones: [] };

  // 3) campos y secciones del formulario
  const [{ data: campos }, { data: secciones }] = await Promise.all([
    supabase.from("campos").select("*").eq("formulario_id", found.id).order("orden"),
    supabase.from("secciones").select("*").eq("formulario_id", found.id).order("orden"),
  ]);

  return {
    formulario: { id: found.id, storage_path: found.storage_path, nombre: found.nombre },
    campos: (campos ?? []) as unknown as Campo[],
    secciones: (secciones ?? []) as unknown as Seccion[],
  };
}
