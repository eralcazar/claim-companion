import type { ShareResourceType } from "@/hooks/useShareLinks";

export interface ShareContext {
  title?: string;
  date?: string;
  doctor?: string;
  specialty?: string;
  location?: string;
  folio?: string;
  insurer?: string;
}

/**
 * Genera un mensaje de WhatsApp personalizado con resumen del recurso
 * y un CTA de registro al portal público de CareCentral.
 */
export function buildWhatsAppMessage(
  resourceType: ShareResourceType,
  url: string,
  ctx: ShareContext = {},
): string {
  const lines: string[] = [];
  switch (resourceType) {
    case "appointment":
      lines.push("🗓️ *Cita médica — CareCentral*");
      if (ctx.date) lines.push(`📅 ${ctx.date}`);
      if (ctx.doctor) lines.push(`👨‍⚕️ ${ctx.doctor}${ctx.specialty ? ` · ${ctx.specialty}` : ""}`);
      if (ctx.location) lines.push(`📍 ${ctx.location}`);
      break;
    case "receta":
      lines.push("💊 *Receta médica — CareCentral*");
      if (ctx.folio) lines.push(`Folio: ${ctx.folio}`);
      if (ctx.doctor) lines.push(`Prescribe: ${ctx.doctor}`);
      if (ctx.date) lines.push(`Emitida: ${ctx.date}`);
      break;
    case "estudio":
      lines.push("🧪 *Solicitud de estudio — CareCentral*");
      if (ctx.title) lines.push(ctx.title);
      if (ctx.doctor) lines.push(`Solicita: ${ctx.doctor}`);
      if (ctx.date) lines.push(`Fecha: ${ctx.date}`);
      break;
    case "claim":
      lines.push("📄 *Solicitud a aseguradora — CareCentral*");
      if (ctx.insurer) lines.push(`Aseguradora: ${ctx.insurer}`);
      if (ctx.folio) lines.push(`Folio: ${ctx.folio}`);
      break;
    case "format":
      lines.push("📝 *Formato de aseguradora — CareCentral*");
      if (ctx.insurer) lines.push(`Aseguradora: ${ctx.insurer}`);
      if (ctx.title) lines.push(ctx.title);
      break;
  }
  lines.push("");
  lines.push(`🔗 Ver detalles: ${url}`);
  lines.push("");
  lines.push("Regístrate gratis en CareCentral para acceder a tu expediente médico completo.");
  return lines.join("\n");
}