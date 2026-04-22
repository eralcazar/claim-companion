import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  catalog_id: string;
  cantidad: number;
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      patient_id,
      receta_id,
      items,
      environment,
      returnUrl,
    }: {
      patient_id: string;
      receta_id?: string | null;
      items: CartItem[];
      environment?: StripeEnv;
      returnUrl?: string;
    } = body;

    if (!patient_id || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch catalog rows
    const ids = items.map((i) => i.catalog_id);
    const { data: catalog, error: catErr } = await supabase
      .from("pharmacy_catalog")
      .select("*")
      .in("id", ids)
      .eq("activo", true);
    if (catErr) throw catErr;
    if (!catalog || catalog.length !== ids.length) {
      return new Response(JSON.stringify({ error: "Some items not found or inactive" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    // Build line items + compute totals
    const lineItems: any[] = [];
    const orderItems: any[] = [];
    let subtotal = 0;
    const moneda = (catalog[0].moneda || "mxn").toLowerCase();
    for (const it of items) {
      const row = catalog.find((c: any) => c.id === it.catalog_id)!;
      const qty = Math.max(1, Math.floor(it.cantidad || 1));
      const sub = row.precio_centavos * qty;
      subtotal += sub;
      lineItems.push({
        price_data: {
          currency: moneda,
          product_data: {
            name: row.nombre + (row.presentacion ? ` (${row.presentacion})` : ""),
          },
          unit_amount: row.precio_centavos,
        },
        quantity: qty,
      });
      orderItems.push({
        catalog_id: row.id,
        nombre_snapshot: row.nombre,
        presentacion_snapshot: row.presentacion,
        precio_unitario_centavos: row.precio_centavos,
        cantidad: qty,
        subtotal_centavos: sub,
      });
    }

    // Create order (pendiente_pago)
    const { data: order, error: orderErr } = await supabase
      .from("pharmacy_orders")
      .insert({
        patient_id,
        created_by: user.id,
        receta_id: receta_id || null,
        subtotal_centavos: subtotal,
        total_centavos: subtotal,
        moneda,
        environment: env,
      })
      .select()
      .single();
    if (orderErr) throw orderErr;

    const itemsToInsert = orderItems.map((oi) => ({ ...oi, order_id: order.id }));
    const { error: itErr } = await supabase.from("pharmacy_order_items").insert(itemsToInsert);
    if (itErr) throw itErr;

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      ui_mode: "embedded",
      return_url:
        returnUrl ||
        `${req.headers.get("origin")}/checkout/return?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      ...(user.email && { customer_email: user.email }),
      metadata: {
        order_id: order.id,
        patient_id,
        kind: "pharmacy_order",
      },
    });

    await supabase
      .from("pharmacy_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret, orderId: order.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("pharmacy-create-checkout error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});