import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sesión requerida" }, 401);

    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await client.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "No autenticado" }, 401);

    const { patient_id } = await req.json().catch(() => ({}));
    if (!patient_id) return json({ error: "patient_id requerido" }, 400);

    // Trae el nombre del paciente
    const { data: profile } = await client
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", patient_id)
      .maybeSingle();

    // Consulta lecturas validadas (requires_review = false)
    const [bp, spo2, temp, glu, hr] = await Promise.all([
      client.from("blood_pressure_readings").select("taken_at,systolic,diastolic,pulse,device_name")
        .eq("patient_id", patient_id).eq("requires_review", false).order("taken_at", { ascending: false }).limit(200),
      client.from("spo2_readings").select("taken_at,spo2,pulse,device_name")
        .eq("patient_id", patient_id).eq("requires_review", false).order("taken_at", { ascending: false }).limit(200),
      client.from("temperature_readings").select("taken_at,temperature_c,method,device_name")
        .eq("patient_id", patient_id).eq("requires_review", false).order("taken_at", { ascending: false }).limit(200),
      client.from("glucose_readings").select("taken_at,glucose_mg_dl,context,device_name")
        .eq("patient_id", patient_id).order("taken_at", { ascending: false }).limit(200),
      client.from("heart_rate_readings").select("taken_at,bpm,device_name")
        .eq("patient_id", patient_id).order("taken_at", { ascending: false }).limit(200),
    ]);

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let page = pdf.addPage([612, 792]);
    let y = 760;
    const left = 40;

    const drawTitle = (text: string, size = 16) => {
      page.drawText(text, { x: left, y, size, font: bold, color: rgb(0.08, 0.18, 0.36) });
      y -= size + 6;
    };
    const drawLine = (text: string, size = 10) => {
      if (y < 60) { page = pdf.addPage([612, 792]); y = 760; }
      page.drawText(text, { x: left, y, size, font, color: rgb(0.1, 0.1, 0.1) });
      y -= size + 4;
    };
    const drawSection = (title: string) => {
      if (y < 100) { page = pdf.addPage([612, 792]); y = 760; }
      y -= 8;
      page.drawText(title, { x: left, y, size: 13, font: bold, color: rgb(0.05, 0.5, 0.5) });
      y -= 18;
    };

    drawTitle("CareCentral · Reporte de lecturas BLE validadas");
    drawLine(`Paciente: ${profile?.full_name ?? patient_id}`);
    if (profile?.email) drawLine(`Correo: ${profile.email}`);
    drawLine(`Generado: ${new Date().toLocaleString("es-MX")}`);
    drawLine("Todas las lecturas incluidas han sido revisadas y validadas por profesional clínico.");

    if (bp.data?.length) {
      drawSection("Presión arterial");
      for (const r of bp.data) {
        drawLine(`• ${new Date(r.taken_at).toLocaleString("es-MX")} — ${r.systolic}/${r.diastolic} mmHg${r.pulse ? ` · ${r.pulse} bpm` : ""} · ${r.device_name ?? ""} · Validado`);
      }
    }
    if (spo2.data?.length) {
      drawSection("Saturación de oxígeno");
      for (const r of spo2.data) {
        drawLine(`• ${new Date(r.taken_at).toLocaleString("es-MX")} — SpO₂ ${r.spo2}%${r.pulse ? ` · ${r.pulse} bpm` : ""} · ${r.device_name ?? ""} · Validado`);
      }
    }
    if (temp.data?.length) {
      drawSection("Temperatura");
      for (const r of temp.data) {
        drawLine(`• ${new Date(r.taken_at).toLocaleString("es-MX")} — ${r.temperature_c} °C · ${r.method ?? ""} · ${r.device_name ?? ""} · Validado`);
      }
    }
    if (glu.data?.length) {
      drawSection("Glucosa");
      for (const r of glu.data) {
        drawLine(`• ${new Date(r.taken_at).toLocaleString("es-MX")} — ${r.glucose_mg_dl} mg/dL · ${r.context ?? ""} · ${r.device_name ?? ""}`);
      }
    }
    if (hr.data?.length) {
      drawSection("Frecuencia cardíaca");
      for (const r of hr.data) {
        drawLine(`• ${new Date(r.taken_at).toLocaleString("es-MX")} — ${r.bpm} bpm · ${r.device_name ?? ""}`);
      }
    }

    const bytes = await pdf.save();
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="lecturas-ble.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("generate-ble-report-pdf error", e);
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}