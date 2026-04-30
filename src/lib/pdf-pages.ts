/**
 * Cuenta páginas de un PDF en el cliente con el mismo regex que la edge function
 * `extract-study-indicators` para garantizar consistencia con el cobro server-side.
 *
 * Si el archivo no es PDF (p.ej. imagen), devuelve 1.
 */
export async function countPdfPages(file: File): Promise<number> {
  if (!file.type.includes("pdf")) return 1;
  try {
    const buf = await file.arrayBuffer();
    // Decodificamos como latin1 para preservar bytes binarios sin distorsión.
    const text = new TextDecoder("latin1").decode(new Uint8Array(buf));
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    const count = matches ? matches.length : 0;
    return Math.max(1, count);
  } catch {
    return 1;
  }
}