import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "get_patient_summary",
  title: "Resumen de paciente",
  description: "Devuelve perfil, últimas citas, medicamentos activos y alertas médicas del paciente indicado (respeta RLS).",
  inputSchema: {
    patient_id: z.string().uuid().describe("ID del paciente (por defecto el usuario conectado)").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ patient_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    const pid = patient_id ?? ctx.getUserId();
    const [profile, appts, meds, alerts] = await Promise.all([
      sb.from("profiles").select("full_name,email,active_role").eq("user_id", pid).maybeSingle(),
      sb.from("appointments").select("id,appointment_date,appointment_type,doctor_name_manual,notes").eq("user_id", pid).order("appointment_date", { ascending: false }).limit(5),
      sb.from("medications").select("id,nombre,dosis,frecuencia,activo").eq("user_id", pid).eq("activo", true).limit(20),
      sb.from("medical_alerts").select("id,tipo,severidad,descripcion,activa").eq("patient_id", pid).eq("activa", true).limit(20),
    ]);
    const firstErr = [profile.error, appts.error, meds.error, alerts.error].find(Boolean);
    if (firstErr) return errorResult(firstErr.message);
    return jsonResult({
      patient_id: pid,
      profile: profile.data,
      recent_appointments: appts.data,
      active_medications: meds.data,
      active_alerts: alerts.data,
    });
  },
});