import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const FREQ_TO_HOURS: Record<string, { enum: string; hours: number }> = {
  cada_4h: { enum: "cada_4_horas", hours: 4 },
  cada_6h: { enum: "cada_6_horas", hours: 6 },
  cada_8h: { enum: "cada_8_horas", hours: 8 },
  cada_12h: { enum: "cada_12_horas", hours: 12 },
  cada_24h: { enum: "cada_24_horas", hours: 24 },
  cada_48h: { enum: "cada_48_horas", hours: 48 },
  semanal: { enum: "semanal", hours: 168 },
};

function mapFrequency(item: any): { enumValue: string; hours: number } {
  if (item.frecuencia === "otro") {
    const h = Number(item.frecuencia_horas) || 8;
    return { enumValue: "personalizado", hours: h };
  }
  return {
    enumValue: FREQ_TO_HOURS[item.frecuencia]?.enum ?? "cada_8_horas",
    hours: FREQ_TO_HOURS[item.frecuencia]?.hours ?? 8,
  };
}

async function notifyPharmacyStaff(orderId: string, patientName?: string) {
  const { data: staff } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "farmacia");
  if (!staff?.length) return;
  const rows = staff.map((s) => ({
    user_id: s.user_id,
    title: "Nuevo pedido pagado",
    body: patientName
      ? `${patientName} pagó un pedido. Listo para preparar.`
      : "Hay un pedido de farmacia pagado listo para preparar.",
    link: "/farmacia",
  }));
  await supabase.from("notifications").insert(rows);
}

async function autoCreateSchedules(recetaId: string, patientId: string) {
  const { data: items } = await supabase
    .from("receta_items")
    .select("*")
    .eq("receta_id", recetaId);
  if (!items?.length) return;

  const today = new Date();

  for (const item of items) {
    const { enumValue, hours } = mapFrequency(item);
    const dosage =
      [item.dosis, item.unidad_dosis].filter(Boolean).join("") || "—";
    const days = Number(item.dias_a_tomar) || null;
    const endDate = days ? new Date(today.getTime() + days * 86400000) : null;

    let medicationId: string | null = null;
    const { data: existingMed } = await supabase
      .from("medications")
      .select("id")
      .eq("user_id", patientId)
      .eq("receta_item_id", item.id)
      .maybeSingle();

    if (existingMed) {
      medicationId = existingMed.id;
      await supabase
        .from("medications")
        .update({
          name: item.medicamento_nombre,
          dosage,
          frequency: enumValue as any,
          frequency_hours: hours,
          start_date: today.toISOString().slice(0, 10),
          end_date: endDate ? endDate.toISOString().slice(0, 10) : null,
          active: true,
        })
        .eq("id", medicationId);
    } else {
      const { data: created, error: medErr } = await supabase
        .from("medications")
        .insert({
          user_id: patientId,
          receta_item_id: item.id,
          name: item.medicamento_nombre,
          dosage,
          frequency: enumValue as any,
          frequency_hours: hours,
          start_date: today.toISOString().slice(0, 10),
          end_date: endDate ? endDate.toISOString().slice(0, 10) : null,
          active: true,
        })
        .select("id")
        .single();
      if (medErr) {
        console.error("medications insert error", medErr);
        continue;
      }
      medicationId = created.id;
    }

    // Deactivate any previous schedule for this receta_item
    await supabase
      .from("medication_schedule")
      .update({ active: false })
      .eq("receta_item_id", item.id)
      .eq("active", true);

    const nextDose = new Date(today.getTime() + hours * 3600000);
    await supabase.from("medication_schedule").insert({
      user_id: patientId,
      medication_id: medicationId,
      receta_item_id: item.id,
      next_dose_at: nextDose.toISOString(),
      interval_hours: hours,
      ends_at: endDate ? endDate.toISOString() : null,
      active: true,
    });
  }
}

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
          .select("patient_id, receta_id, status")
          .eq("id", orderId)
          .maybeSingle();

        // Idempotency: skip if already paid
        if (order && order.status !== "pagada") {
          await supabase
            .from("pharmacy_orders")
            .update({
              status: "pagada",
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: session.payment_intent || null,
            })
            .eq("id", orderId);

          // Notify patient
          if (order.patient_id) {
            await supabase.from("notifications").insert({
              user_id: order.patient_id,
              title: "Pago de farmacia recibido",
              body: "Tu pedido fue pagado. La farmacia comenzará a prepararlo.",
              link: "/farmacia",
            });

            // Notify pharmacy staff
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", order.patient_id)
              .maybeSingle();
            await notifyPharmacyStaff(orderId, profile?.full_name);
          }

          // Auto-create medication schedule from linked receta
          if (order.receta_id && order.patient_id) {
            try {
              await autoCreateSchedules(order.receta_id, order.patient_id);
            } catch (schedErr) {
              console.error("autoCreateSchedules failed", schedErr);
            }
          }
        }
      }

      // OCR pack purchase
      if (kind === "ocr_pack") {
        const purchaseId = session.metadata?.purchase_id;
        const userId = session.metadata?.userId;
        const cantidad = Number(session.metadata?.cantidad_escaneos || 0);
        if (purchaseId && userId && cantidad > 0) {
          const { data: purchase } = await supabase
            .from("ocr_pack_purchases")
            .select("status")
            .eq("id", purchaseId)
            .maybeSingle();
          if (purchase && purchase.status !== "paid") {
            await supabase
              .from("ocr_pack_purchases")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                stripe_payment_intent_id: session.payment_intent || null,
              })
              .eq("id", purchaseId);
            await supabase.rpc("add_ocr_credits", {
              _user_id: userId,
              _pages: cantidad,
              _source: "addon",
            });
            await supabase.from("notifications").insert({
              user_id: userId,
              title: "Escaneos OCR añadidos",
              body: `Se acreditaron ${cantidad} escaneos OCR a tu cuenta.`,
              link: `/planes?ocr_purchase=${purchaseId}#compras-ocr`,
            });
          }
        }
      }
    }

    // Subscription lifecycle
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const s: any = event.data.object;
      const userId = s.metadata?.userId;
      const planId = s.metadata?.plan_id || null;
      if (userId) {
        const item = s.items?.data?.[0];
        const priceId = item?.price?.id || null;
        const productId = item?.price?.product || null;
        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            plan_id: planId,
            stripe_subscription_id: s.id,
            stripe_customer_id: s.customer,
            product_id: productId,
            price_id: priceId,
            status: s.status,
            current_period_start: s.current_period_start
              ? new Date(s.current_period_start * 1000).toISOString()
              : null,
            current_period_end: s.current_period_end
              ? new Date(s.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: !!s.cancel_at_period_end,
            environment: env,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" },
        );
        // Refresh OCR subscription quota according to current plan
        try {
          await supabase.rpc("sync_subscription_ocr_quota", { _user_id: userId });
        } catch (qErr) {
          console.error("sync_subscription_ocr_quota failed", qErr);
        }
      }
    }
    if (event.type === "customer.subscription.deleted") {
      const s: any = event.data.object;
      await supabase
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", s.id)
        .eq("environment", env);
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