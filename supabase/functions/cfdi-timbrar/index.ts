import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Genera un XML CFDI 4.0 mínimo (para modo simulado/demo).
// En producción real el XML debe construirse conforme al Anexo 20 y sellarse con el CSD.
function xmlEscape(s: string) {
  return (s || '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' } as any)[c])
}

function buildDemoXML(inv: any, cfg: any, uuid: string, fecha: string, sello: string): string {
  const conceptoDesc = xmlEscape(inv.concepto || 'Servicio')
  const importe = Number(inv.subtotal).toFixed(2)
  const iva = Number(inv.iva).toFixed(2)
  const total = Number(inv.total).toFixed(2)
  const serie = xmlEscape(cfg.serie || 'A')
  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  Version="4.0" Serie="${serie}" Folio="${xmlEscape(inv.folio || '')}"
  Fecha="${fecha}" FormaPago="${xmlEscape(inv.forma_pago || '03')}" MetodoPago="PUE"
  SubTotal="${importe}" Total="${total}" Moneda="${xmlEscape(inv.moneda || 'MXN')}"
  TipoDeComprobante="I" LugarExpedicion="${xmlEscape(cfg.codigo_postal)}"
  Exportacion="01" NoCertificado="${xmlEscape(cfg.csd_no_certificado || '00001000000500000000')}"
  Certificado="DEMO" Sello="${sello}">
  <cfdi:Emisor Rfc="${xmlEscape(cfg.rfc)}" Nombre="${xmlEscape(cfg.razon_social)}" RegimenFiscal="${xmlEscape(cfg.regimen_fiscal || '612')}"/>
  <cfdi:Receptor Rfc="${xmlEscape(inv.rfc_receptor || 'XAXX010101000')}" Nombre="${xmlEscape(inv.razon_social_receptor || 'PUBLICO EN GENERAL')}"
    DomicilioFiscalReceptor="${xmlEscape(inv.cp_receptor || cfg.codigo_postal)}"
    RegimenFiscalReceptor="${xmlEscape(inv.regimen_fiscal_receptor || '616')}"
    UsoCFDI="${xmlEscape(inv.uso_cfdi || 'G03')}"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="85121800" Cantidad="1" ClaveUnidad="E48" Unidad="Servicio"
      Descripcion="${conceptoDesc}" ValorUnitario="${importe}" Importe="${importe}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${importe}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${iva}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${iva}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${importe}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${iva}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1" UUID="${uuid}" FechaTimbrado="${fecha}"
      RfcProvCertif="SAT970701NN3" SelloCFD="${sello}" NoCertificadoSAT="00001000000500000000"
      SelloSAT="DEMO_SELLO_SAT"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`
}

function buildDemoPDFText(inv: any, cfg: any, uuid: string, fecha: string, modo: string): Uint8Array {
  // PDF ultra-minimalista tipo "recibo" (formato PDF válido)
  const lines = [
    `CareCentral - Comprobante Fiscal Digital`,
    modo === 'simulado' ? '*** MODO SIMULADO - NO VALIDO PARA SAT ***' : (modo === 'sandbox' ? '*** MODO PRUEBAS (SANDBOX) ***' : ''),
    ``,
    `Emisor: ${cfg.razon_social}  RFC: ${cfg.rfc}`,
    `Receptor: ${inv.razon_social_receptor || 'PUBLICO EN GENERAL'}  RFC: ${inv.rfc_receptor || 'XAXX010101000'}`,
    ``,
    `Serie/Folio: ${cfg.serie || 'A'}/${inv.folio || ''}`,
    `UUID: ${uuid}`,
    `Fecha timbrado: ${fecha}`,
    ``,
    `Concepto: ${inv.concepto || ''}`,
    `Subtotal: $${Number(inv.subtotal).toFixed(2)} MXN`,
    `IVA:      $${Number(inv.iva).toFixed(2)} MXN`,
    `TOTAL:    $${Number(inv.total).toFixed(2)} MXN`,
  ]
  const content = lines.map((l, i) => `BT /F1 11 Tf 40 ${780 - i * 18} Td (${l.replace(/[()\\]/g, '')}) Tj ET`).join('\n')
  const stream = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  const objs = [
    `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`,
    `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`,
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj`,
    `4 0 obj ${stream} endobj`,
    `5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (const o of objs) { offsets.push(pdf.length); pdf += o + '\n' }
  const xrefStart = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += String(off).padStart(10, '0') + ' 00000 n \n'
  pdf += `trailer << /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return new TextEncoder().encode(pdf)
}

async function stampWithSW(xml: string, token: string): Promise<{ ok: boolean; xml?: string; uuid?: string; error?: string }> {
  try {
    const b64 = btoa(unescape(encodeURIComponent(xml)))
    const resp = await fetch('https://services.test.sw.com.mx/cfdi33/stamp/v4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `bearer ${token}` },
      body: JSON.stringify({ data: b64 }),
    })
    const j: any = await resp.json()
    if (j?.status === 'success' && j?.data?.cfdi) {
      return { ok: true, xml: j.data.cfdi, uuid: j.data.uuid }
    }
    return { ok: false, error: j?.message || j?.messageDetail || 'PAC error' }
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const authHeader = req.headers.get('Authorization') || ''
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  try {
    const { invoice_id } = await req.json()
    if (!invoice_id) return new Response(JSON.stringify({ error: 'invoice_id requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: userRes } = await userClient.auth.getUser()
    const actorId = userRes?.user?.id
    if (!actorId) return new Response(JSON.stringify({ error: 'no autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: inv, error: invErr } = await supabase.from('medico_invoices').select('*').eq('id', invoice_id).maybeSingle()
    if (invErr || !inv) return new Response(JSON.stringify({ error: 'factura no encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (inv.uuid_sat) {
      return new Response(JSON.stringify({ ok: true, already: true, uuid: inv.uuid_sat, xml_url: inv.xml_url, pdf_url: inv.pdf_url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Buscar config del emisor: prioridad emisor_id explícito, luego doctor_id
    let cfg: any = null
    if (inv.emisor_id) {
      const r = await supabase.from('cfdi_config').select('*').eq('id', inv.emisor_id).maybeSingle()
      cfg = r.data
    }
    if (!cfg) {
      const r = await supabase.from('cfdi_config').select('*').eq('owner_id', inv.doctor_id).eq('activo', true).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      cfg = r.data
    }

    let modo: 'simulado' | 'sandbox' | 'produccion' = 'simulado'
    let usedCfg = cfg
    if (!cfg) {
      // Config demo por defecto
      usedCfg = {
        rfc: 'EKU9003173C9', razon_social: 'ESCUELA KEMPER URGATE',
        regimen_fiscal: '601', codigo_postal: '42501', serie: 'A',
        csd_no_certificado: '00001000000500000000',
      }
    } else {
      modo = cfg.modo === 'produccion' ? 'produccion' : 'sandbox'
    }

    const uuid = crypto.randomUUID().toUpperCase()
    const fecha = new Date().toISOString().split('.')[0]
    const sello = `DEMO_${uuid.replace(/-/g, '').substring(0, 40)}`
    let xml = buildDemoXML(inv, usedCfg, uuid, fecha, sello)
    let finalUuid = uuid
    let stampError: string | null = null

    // Si sandbox y hay token SW → intenta timbrar de verdad
    const swToken = Deno.env.get('SW_SANDBOX_TOKEN')
    if (modo === 'sandbox' && swToken) {
      const r = await stampWithSW(xml, swToken)
      if (r.ok && r.xml && r.uuid) {
        xml = r.xml
        finalUuid = r.uuid
      } else {
        stampError = r.error || 'SW error'
        modo = 'simulado'
      }
    } else if (modo === 'produccion') {
      return new Response(JSON.stringify({ error: 'Modo producción no habilitado: falta integración PAC producción.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Guardar XML y PDF en bucket cfdi-docs
    const xmlBytes = new TextEncoder().encode(xml)
    const pdfBytes = buildDemoPDFText(inv, usedCfg, finalUuid, fecha, modo)
    const basePath = `${inv.doctor_id}/${inv.id}`
    await supabase.storage.from('cfdi-docs').upload(`${basePath}/factura.xml`, xmlBytes, { upsert: true, contentType: 'application/xml' })
    await supabase.storage.from('cfdi-docs').upload(`${basePath}/factura.pdf`, pdfBytes, { upsert: true, contentType: 'application/pdf' })
    const xmlUrl = `cfdi-docs/${basePath}/factura.xml`
    const pdfUrl = `cfdi-docs/${basePath}/factura.pdf`

    await supabase.from('medico_invoices').update({
      uuid_sat: finalUuid, xml_url: xmlUrl, pdf_url: pdfUrl,
      sello, no_certificado: usedCfg.csd_no_certificado, fecha_timbrado: new Date().toISOString(),
      serie: usedCfg.serie || 'A', modo, estado: 'emitida',
      emisor_id: cfg?.id ?? null, emisor_type: cfg?.emisor_type ?? null,
      error_timbrado: stampError,
    }).eq('id', invoice_id)

    await supabase.from('cfdi_stamps').insert({
      invoice_id, actor_id: actorId, pac: cfg?.pac || 'sw_sapien', modo,
      uuid_sat: finalUuid, xml_url: xmlUrl, pdf_url: pdfUrl, ok: !stampError, error: stampError,
    })

    return new Response(JSON.stringify({ ok: true, uuid: finalUuid, modo, xml_url: xmlUrl, pdf_url: pdfUrl, warning: stampError }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})