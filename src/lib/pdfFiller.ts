import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface FieldOverlay {
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
    try {
      page.drawText(String(field.value), {
        x: field.x,
        y: field.y,
        size: field.fontSize || 8,
        font,
        color: rgb(0, 0, 0),
        maxWidth: field.maxWidth,
      });
    } catch {
      // Ignorar caracteres que la fuente no soporte
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
