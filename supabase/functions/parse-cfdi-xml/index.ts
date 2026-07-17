import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { XMLParser } from 'npm:fast-xml-parser@4';

// Parse CFDI 4.0/3.3 XML and return structured invoice ready to insert
// into pharmacy_purchases + pharmacy_purchase_items.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { xml } = await req.json();
    if (!xml || typeof xml !== 'string') {
      return json({ error: 'xml requerido' }, 400);
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      removeNSPrefix: true,
      parseAttributeValue: false,
    });
    const parsed = parser.parse(xml);
    const comp = parsed?.Comprobante;
    if (!comp) return json({ error: 'CFDI inválido: no se encontró Comprobante' }, 400);

    const emisor = comp.Emisor ?? {};
    const receptor = comp.Receptor ?? {};
    const tfd = comp?.Complemento?.TimbreFiscalDigital ?? {};
    const conceptosRaw = comp?.Conceptos?.Concepto;
    const conceptos = Array.isArray(conceptosRaw)
      ? conceptosRaw
      : conceptosRaw
        ? [conceptosRaw]
        : [];

    const items = conceptos.map((c: any) => {
      const cantidad = Number(c.Cantidad ?? 1);
      const valorUnit = Number(c.ValorUnitario ?? 0);
      const importe = Number(c.Importe ?? cantidad * valorUnit);
      const iva = c?.Impuestos?.Traslados?.Traslado;
      const ivaPct = iva
        ? Number((Array.isArray(iva) ? iva[0] : iva).TasaOCuota ?? 0.16) * 100
        : 16;
      return {
        descripcion: String(c.Descripcion ?? ''),
        clave_sat: String(c.ClaveProdServ ?? ''),
        cantidad,
        costo_unitario_centavos: Math.round(valorUnit * 100),
        subtotal_centavos: Math.round(importe * 100),
        iva_pct: Math.round(ivaPct),
        lote: null,
        caducidad: null,
      };
    });

    const result = {
      cfdi_uuid: String(tfd.UUID ?? ''),
      supplier_rfc: String(emisor.Rfc ?? ''),
      supplier_nombre: String(emisor.Nombre ?? ''),
      receptor_rfc: String(receptor.Rfc ?? ''),
      fecha: String(comp.Fecha ?? new Date().toISOString()),
      subtotal_centavos: Math.round(Number(comp.SubTotal ?? 0) * 100),
      iva_centavos: Math.round((Number(comp.Total ?? 0) - Number(comp.SubTotal ?? 0)) * 100),
      total_centavos: Math.round(Number(comp.Total ?? 0) * 100),
      moneda: String(comp.Moneda ?? 'MXN'),
      items,
    };

    return json(result, 200);
  } catch (e) {
    console.error('parse-cfdi-xml error', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}