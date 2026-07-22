// Sanitizador de PII y heurística de caché para prompts que salen hacia proveedores de IA.
// Este archivo es la copia canónica del cliente y espejo verbatim de
// `supabase/functions/_shared/ai-router.ts`. Al modificar reglas, actualizar ambos y
// re-ejecutar `src/test/ai-sanitize.test.ts` para verificar cobertura de PII.

export function normalizePrompt(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b[a-z]{4}\d{6}[hm][a-z]{5}[a-z0-9]\d\b/gi, "[curp]")
    .replace(/\b[a-z&ñ]{3,4}\d{6}[a-z0-9]{3}\b/gi, "[rfc]")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]")
    .replace(/\b\d{10}\b/g, "[tel]")
    .replace(/\b\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}\b/g, "[fecha]")
    .replace(/\b\d{4,}\b/g, "[num]")
    .replace(/[¿?¡!.,;:()"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCacheableGeneric(originalText: string, normalizedText: string): boolean {
  const original = originalText.trim();
  if (original.length < 8 || original.length > 500) return false;
  const personalMarkers = [
    /\bmi (dolor|paciente|hijo|hija|mam[áa]|pap[áa]|esposa|esposo|abuel|hermano|hermana)\b/i,
    /\byo (tengo|tomo|siento|padezco|uso)\b/i,
    /\bme (duele|siento|dieron|recetaron|dijeron)\b/i,
    /\b(hoy|ayer|anoche|esta ma[ñn]ana|hace \d+)\b/i,
    /\b\d{2,3}\/\d{2,3}\b/,
    /\bmg\/dl\b/i,
    /\bmmhg\b/i,
  ];
  if (personalMarkers.some((rx) => rx.test(original))) return false;
  const educationalMarkers = [
    /\bqu[ée] es\b/i,
    /\bpara qu[ée] sirve\b/i,
    /\bc[oó]mo funciona\b/i,
    /\bdiferencia entre\b/i,
    /\bs[ií]ntomas de\b/i,
    /\bcausas de\b/i,
    /\brecomendaciones? generales?\b/i,
    /\bexplica(me)?\b/i,
    /\bdefinici[oó]n de\b/i,
  ];
  return educationalMarkers.some((rx) => rx.test(original));
}

/**
 * Comprueba si un prompt sanitizado sigue conteniendo posible PII residual
 * (nombres propios múltiples, direcciones, coordenadas). Se usa como red de
 * seguridad antes de enviar a cualquier proveedor externo.
 */
export function hasResidualPii(sanitized: string): boolean {
  const patterns = [
    // Direcciones con palabras clave
    /\b(calle|avenida|av\.|colonia|col\.|c\.p\.|codigo postal|cp)\b/i,
    // Coordenadas GPS
    /-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,}/,
    // Números telefónicos con formato variado (permite grupos separados)
    /\+\d{1,3}(?:[\s-]?\d{1,4}){2,5}/,
    /\b\d{3}[\s-]\d{3}[\s-]\d{4}\b/,
  ];
  return patterns.some((rx) => rx.test(sanitized));
}

/**
 * Detecta tipos de PII presentes en el texto ORIGINAL (antes de sanitizar).
 * Devuelve una lista de etiquetas ("curp", "rfc", "email", "telefono", "fecha",
 * "direccion", "coordenada", "numero_largo") que se guardan como evidencia
 * de sanitización en la auditoría.
 */
export function detectPiiFields(original: string): string[] {
  const rules: Array<[string, RegExp]> = [
    ["curp", /\b[a-z]{4}\d{6}[hm][a-z]{5}[a-z0-9]\d\b/i],
    ["rfc", /\b[a-z&ñ]{3,4}\d{6}[a-z0-9]{3}\b/i],
    ["email", /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/],
    ["telefono", /(\+\d{1,3}[\s-]?)?\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/],
    ["fecha", /\b\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}\b/],
    ["direccion", /\b(calle|avenida|av\.|colonia|col\.|c\.p\.|codigo postal|cp)\b/i],
    ["coordenada", /-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,}/],
    ["numero_largo", /\b\d{4,}\b/],
  ];
  const found = new Set<string>();
  for (const [label, rx] of rules) if (rx.test(original)) found.add(label);
  return Array.from(found);
}