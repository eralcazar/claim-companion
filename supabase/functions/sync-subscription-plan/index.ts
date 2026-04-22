import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function ensurePrice(
  stripe: any,
  existingPriceId: string | null,
  productId: string,
  amount: number,
  currency: string,
  interval: "month" | "year",
): Promise<string | null> {
  if (amount <= 0) return null;
  if (existingPriceId) {
    try {
      const existing = await stripe.prices.retrieve(existingPriceId);
      if (
        existing.unit_amount === amount &&
        existing.currency === currency &&
        existing.recurring?.interval === interval &&
        existing.active
      ) {
        return existingPriceId;
      }
      await stripe.prices.update(existingPriceId, { active: false });
    } catch (_e) {
      // ignore — create fresh
    }
  }
  const created = await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency,
    recurring: { interval },
  });
  return created.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!roleRow?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { plan_id, environment } = await req.json();
    if (!plan_id) throw new Error("plan_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: plan, error: pErr } = await admin
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .maybeSingle();
    if (pErr || !plan) throw new Error("Plan no encontrado");

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);
    const currency = (plan.moneda || "mxn").toLowerCase();

    let productId = plan.stripe_product_id;
    if (!productId) {
      const created = await stripe.products.create({
        name: plan.nombre,
        description: plan.descripcion || undefined,
        metadata: { plan_id: plan.id, lovable_external_id: plan.id, kind: "platform_plan" },
      });
      productId = created.id;
    } else {
      await stripe.products.update(productId, {
        name: plan.nombre,
        description: plan.descripcion || undefined,
      });
    }

    const monthlyPriceId = await ensurePrice(
      stripe,
      plan.stripe_price_id_mensual,
      productId,
      plan.precio_mensual_centavos,
      currency,
      "month",
    );
    const yearlyPriceId = await ensurePrice(
      stripe,
      plan.stripe_price_id_anual,
      productId,
      plan.precio_anual_centavos,
      currency,
      "year",
    );

    await admin
      .from("subscription_plans")
      .update({
        stripe_product_id: productId,
        stripe_price_id_mensual: monthlyPriceId,
        stripe_price_id_anual: yearlyPriceId,
      })
      .eq("id", plan.id);

    return new Response(
      JSON.stringify({
        ok: true,
        stripe_product_id: productId,
        stripe_price_id_mensual: monthlyPriceId,
        stripe_price_id_anual: yearlyPriceId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("sync-subscription-plan error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});