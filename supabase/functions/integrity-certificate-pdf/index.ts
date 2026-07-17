import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { patient_id } = await req.json();
    if (!patient_id) return new Response("patient_id required", { status: 400, headers: corsHeaders });

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return new Response("unauthorized", { status: 401, headers: corsHeaders });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch patient records tip-list per table
    const rowsByTable: Record<string, any[]> = {};
    for (const t of ["medical_records", "recetas", "estudios_solicitados"] as const) {
      const patientCol = t === "medical_records" ? "user_id" : "patient_id";
      const { data } = await supabase
        .from(t)
        .select(`id, created_at, record_hash, key_id, signed_at, signature`)
        .eq(patientCol, patient_id)
        .not("record_hash", "is", null)
        .order("created_at", { ascending: true });
      rowsByTable[t] = data ?? [];
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: root } = await supabase
      .from("integrity_daily_roots")
      .select("*")
      .lte("day", today)
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: activeKey } = await supabase
      .from("integrity_keys").select("*").eq("status", "active").maybeSingle();

    // Build PDF
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595, 842]);
    let y = 800;
    const line = (text: string, opts: { size?: number; bold?: boolean } = {}) => {
      const size = opts.size ?? 10;
      const f = opts.bold ? bold : font;
      if (y < 50) { page = pdf.addPage([595, 842]); y = 800; }
      page.drawText(text, { x: 40, y, size, font: f, color: rgb(0.1, 0.1, 0.15) });
      y -= size + 4;
    };

    line("Comprobante de integridad clínica", { size: 16, bold: true });
    line(`CareCentral · Emitido: ${new Date().toISOString()} UTC`, { size: 9 });
    y -= 8;
    line("Raíz de integridad diaria (más reciente)", { size: 12, bold: true });
    line(`Día: ${root?.day ?? "—"}`);
    line(`Raíz diaria (SHA-256): ${root?.daily_root ?? "—"}`, { size: 8 });
    line(`Raíz previa: ${root?.prev_daily_root ?? "GENESIS"}`, { size: 8 });
    line(`Llave activa: ${activeKey?.key_id ?? "—"} (${activeKey?.algorithm ?? "HMAC-SHA256"})`);
    y -= 8;

    for (const [table, rows] of Object.entries(rowsByTable)) {
      line(`${table} — ${rows.length} registro(s)`, { size: 12, bold: true });
      for (const r of rows.slice(-20)) {
        line(`• ${new Date(r.created_at).toISOString()} [${r.key_id}] ${r.signature ? "firmado" : "pendiente"}`, { size: 8 });
        line(`  hash: ${r.record_hash}`, { size: 7 });
      }
      if (rows.length > 20) line(`… y ${rows.length - 20} anteriores no listados`, { size: 8 });
      y -= 4;
    }

    line("Este documento acredita que los registros clínicos del paciente forman parte de una cadena SHA-256", { size: 8 });
    line("verificable en la plataforma CareCentral. Cualquier alteración posterior romperá la cadena y podrá detectarse.", { size: 8 });

    const bytes = await pdf.save();
    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="integridad-${patient_id}.pdf"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});