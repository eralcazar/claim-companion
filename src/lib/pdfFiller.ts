import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface FieldOverlay {
  key?: string;
  page: number;        // 0-indexed
  x: number;           // puntos desde esquina inferior izquierda
  y: number;
  value: string;
  fontSize?: number;
  maxWidth?: number;
}

export async function fillPDF(
  pdfBytes: ArrayBuffer | Uint8Array,
  fields: FieldOverlay[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const field of fields) {
    if (field.value == null || String(field.value).trim() === "") continue;
    const page = pages[field.page];
    if (!page) continue;
    // Sanitizar: WinAnsi (Helvetica estándar) no soporta todos los unicode.
    // Reemplazamos caracteres problemáticos para evitar que pdf-lib lance.
    const safe = String(field.value)
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2026/g, "...")
      // eliminar cualquier carácter fuera del rango básico latino-1
      .replace(/[^\x00-\xFF]/g, "");
    try {
      page.drawText(safe, {
        x: field.x,
        y: field.y,
        size: field.fontSize || 8,
        font,
        color: rgb(0, 0, 0),
        maxWidth: field.maxWidth,
      });
    } catch (err) {
      console.warn(`[fillPDF] no se pudo dibujar campo`, field.key, err);
    }
  }

  return pdfDoc.save();
}

export async function drawCheckmark(
  pdfBytes: ArrayBuffer | Uint8Array,
  checks: Array<{ page: number; x: number; y: number; checked: boolean }>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const check of checks) {
    if (!check.checked) continue;
    const page = pages[check.page];
    if (!page) continue;
    page.drawText("X", {
      x: check.x,
      y: check.y,
      size: 7,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return pdfDoc.save();
}
