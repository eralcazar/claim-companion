import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("payments-webhook event:", event.type, "env:", env);

    if (event.type === "checkout.session.completed") {
      const session: any = event.data.object;
      const orderId = session.metadata?.order_id;
      const kind = session.metadata?.kind;
      if (kind === "pharmacy_order" && orderId) {
        const { data: order } = await supabase
          .from("pharmacy_orders")
          .select("patient_id, receta_id")
          .eq("id", orderId)
          .maybeSingle();

        await supabase
          .from("pharmacy_orders")
          .update({
            status: "pagada",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent || null,
          })
          .eq("id", orderId);

        if (order?.patient_id) {
          await supabase.from("notifications").insert({
            user_id: order.patient_id,
            title: "Pago de farmacia recibido",
            body: "Tu pedido fue pagado. La farmacia comenzará a prepararlo.",
            link: "/farmacia",
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Webhook error:", e.message);
    return new Response("Webhook error", { status: 400 });
  }
});