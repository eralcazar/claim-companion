import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AppRole = "admin" | "broker" | "paciente" | "medico";

interface CreatePayload {
  action: "create";
  email: string;
  password: string;
  full_name: string;
  roles: AppRole[];
}

interface DeletePayload {
  action: "delete";
  user_id: string;
}

type Payload = CreatePayload | DeletePayload;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client scoped to caller for identity check
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const callerId = claimsData.claims.sub as string;

    // Admin-privileged client
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Verify caller is admin
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return jsonResponse({ error: "Forbidden: admin only" }, 403);
    }

    const payload = (await req.json()) as Payload;

    if (payload.action === "create") {
      const { email, password, full_name, roles } = payload;
      if (!email || !password || !full_name) {
        return jsonResponse(
          { error: "email, password y full_name son requeridos" },
          400,
        );
      }
      if (password.length < 8) {
        return jsonResponse(
          { error: "La contraseña debe tener al menos 8 caracteres" },
          400,
        );
      }
      const validRoles: AppRole[] = ["admin", "broker", "paciente", "medico"];
      const cleanRoles = (roles ?? []).filter((r) =>
        validRoles.includes(r),
      ) as AppRole[];

      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });
      if (createErr || !created.user) {
        return jsonResponse(
          { error: createErr?.message ?? "No se pudo crear el usuario" },
          400,
        );
      }
      const newUserId = created.user.id;

      // The handle_new_user trigger inserts profile + 'paciente' role.
      // Adjust roles to match request.
      const wantsPaciente = cleanRoles.includes("paciente");
      if (!wantsPaciente) {
        await admin
          .from("user_roles")
          .delete()
          .eq("user_id", newUserId)
          .eq("role", "paciente");
      }
      const extra = cleanRoles.filter((r) => r !== "paciente");
      if (extra.length > 0) {
        const rows = extra.map((role) => ({ user_id: newUserId, role }));
        const { error: insErr } = await admin
          .from("user_roles")
          .insert(rows);
        if (insErr && !insErr.message.includes("duplicate")) {
          return jsonResponse(
            { error: `Usuario creado pero falló al asignar roles: ${insErr.message}` },
            500,
          );
        }
      }

      return jsonResponse({ user_id: newUserId, email });
    }

    if (payload.action === "delete") {
      const { user_id } = payload;
      if (!user_id) {
        return jsonResponse({ error: "user_id requerido" }, 400);
      }
      if (user_id === callerId) {
        return jsonResponse(
          { error: "No puedes eliminar tu propio usuario" },
          400,
        );
      }

      // Clean up dependent rows that don't cascade
      await admin.from("broker_patients").delete().or(
        `patient_id.eq.${user_id},broker_id.eq.${user_id}`,
      );
      await admin.from("user_roles").delete().eq("user_id", user_id);
      await admin.from("profiles").delete().eq("user_id", user_id);

      const { error: delErr } = await admin.auth.admin.deleteUser(user_id);
      if (delErr) {
        return jsonResponse({ error: delErr.message }, 400);
      }
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Acción no soportada" }, 400);
  } catch (e) {
    return jsonResponse(
      { error: (e as Error).message ?? "Error inesperado" },
      500,
    );
  }
});