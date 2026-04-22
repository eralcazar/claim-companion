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

export interface ImageOverlay {
  page: number;       // 0-indexed
  x: number;          // PDF points (bottom-left origin)
  y: number;
  width: number;      // PDF points
  height: number;
  dataUrl: string;    // PNG base64 dataURL
}

/**
 * Estampa una o más imágenes (firmas) dentro del PDF.
 * Acepta dataURL PNG (las firmas del canvas siempre son PNG).
 */
export async function drawImages(
  pdfBytes: ArrayBuffer | Uint8Array,
  images: ImageOverlay[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  for (const img of images) {
    if (!img.dataUrl) continue;
    const page = pages[img.page];
    if (!page) continue;
    try {
      // Extraer base64 del dataURL
      const b64 = img.dataUrl.split(",")[1] || img.dataUrl;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const png = await pdfDoc.embedPng(bytes);
      page.drawImage(png, {
        x: img.x,
        y: img.y,
        width: img.width,
        height: img.height,
      });
    } catch (err) {
      console.warn("[drawImages] no se pudo dibujar imagen", err);
    }
  }

  return pdfDoc.save();
}
