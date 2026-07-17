# Mega-turno 2 de Farmacia + Marketplace

Ejecuto en **5 fases** para mantener control de calidad. Cada fase deja algo funcional.

## Fase 0 — Prerequisitos (necesito de ti)
- **Twilio** (WhatsApp): API Key SID, API Key Secret y número WhatsApp Business (`whatsapp:+521...`). Si aún no tienes número aprobado, arranco en modo Sandbox de Twilio.
- **Skydropx**: API key (v1 o v2). Sandbox está OK para pruebas.
- **Dominio de email**: verifico el estado y, si falta, disparo el asistente de setup.

## Fase 1 — Clientes de Farmacia + CxC
- Tabla `pharmacy_customers` (RFC, email, tel, límite crédito, días crédito) — ya existe base, la extiendo.
- Tablas `pharmacy_customer_accounts` (saldo, aging 0-30/31-60/61-90/>90), `pharmacy_customer_payments` (abonos).
- Trigger que actualiza saldo al facturar POS a crédito y al registrar abono.
- Vista `/farmacia/clientes`:
  - Lista con saldo actual + aging semáforo.
  - Detalle: historial de compras, pagos, botón "Registrar abono", "Estado de cuenta PDF".

## Fase 2 — Recordatorios automáticos (WhatsApp + Email)
- Tabla `reminder_schedules` (pedido/cliente, tipo, fecha_envío, canal, estado).
- Tabla `reminder_templates` editables por admin (variables: `{nombre}`, `{folio}`, `{saldo}`, `{fecha}`).
- Edge function `send-reminders` (cron cada 15 min):
  - Lee CxC vencidas y próximas a vencer (T-3, T-0, T+3, T+7, T+15).
  - Envía WhatsApp via Twilio Content API + Email via Lovable Emails como respaldo.
  - Registra en `reminder_send_log` para evitar duplicados.
- En `/farmacia/pedidos`: botón manual "Enviar recordatorio ahora" (WA/Email) por pedido.
- Panel `/farmacia/recordatorios`: bandeja de programados/enviados/fallidos.

## Fase 3 — Surtido FEFO en piso
- Extensión de `/farmacia/pedidos` con vista "Surtido":
  - Lista de items con sugerencia FEFO automática (`sugerir_lotes_fefo`).
  - Escaneo de código de barras (Web Barcode API si disponible, sino input manual).
  - Verificación cantidad esperada vs. tomada.
  - Estados: `pendiente_surtido` → `en_surtido` → `surtido` → `empaquetado`.
  - Firma digital del surtidor + timestamp.
- Genera `pharmacy_lot_movements` tipo `salida` automáticamente al confirmar.

## Fase 4 — Shipments Skydropx
- Tabla `shipments` (pedido, paquete, dirección_origen, destino, cotizaciones[], guía_seleccionada, tracking, PDF label).
- Edge function `skydropx-quote`: cotiza al confirmar dirección → muestra tarifas (DHL, Estafeta, FedEx, Redpack).
- Edge function `skydropx-create-shipment`: genera guía 4x6 (PDF), guarda tracking.
- En flujo de despacho: paso "Envío" con selector de tarifa + generar etiqueta.
- Webhook `skydropx-webhook` para actualizar estatus (en_tránsito, entregado).

## Fase 5 — Tienda online `/tienda`
- Página pública con catálogo (usa `pharmacy_catalog` con flag `publicable_online`).
- Búsqueda + filtros por categoría, marca.
- Carrito persistente (localStorage + sync a `cart_sessions` si logueado).
- Checkout: cliente invitado o login → dirección → cotización Skydropx → método pago (Stripe/Paddle) → confirmación.
- Genera `pharmacy_orders` tipo `online` con estado `pendiente_pago`.
- Email de confirmación + WhatsApp con tracking al despachar.
- Vista `/tienda/pedido/:folio` para seguimiento público con token.

## Notas técnicas
- Todas las nuevas tablas con RLS + GRANT a `authenticated` / `service_role` (público de tienda vía RPC específica).
- Recordatorios respetan `notification_preferences.quiet_hours` del cliente.
- Skydropx: cotizaciones se cachean 30 min para evitar hits repetidos.
- Cron `send-reminders`: agendado con pg_cron cada 15 min.
- CxC aging se calcula on-the-fly con función `pharmacy_customer_aging(_customer_id)` para evitar drift.

## Orden de ejecución
Fase 0 (bloqueante) → Fases 1+2 en paralelo → Fase 3 → Fase 4 → Fase 5.

¿Confirmas y me pasas credenciales de Twilio y Skydropx para arrancar Fase 0?
