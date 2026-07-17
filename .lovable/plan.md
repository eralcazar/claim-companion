
# Suite Farmacia CareCentral — Plan de Ejecución (10 sprints)

Respuestas registradas:
1. **Paquetería**: cotizamos con Skydropx y Envia.com (comparativa por envío)
2. **PAC**: Facturama para timbrado CFDI 4.0 (ventas POS, complementos de pago, ingresos)
3. **POS**: impresión térmica web (WebUSB/Web-Print) + fallback PDF/email/WhatsApp
4. **Apify free**: sí, la cuenta free ($5 USD/mes en créditos) funciona para arrancar — alcanza ~50-150 corridas de scrapers ligeros/mes. Suficiente para actualizar precios de 200-500 SKU 1-2x/día. Si crece el catálogo migramos a plan pago ($49/mes).
5. **Laboratorio**: convenio existente, arrancamos con esa integración
6. **Multi-sucursal**: sí, esquema con `sucursal_id` desde día 1 (farmacia principal + Central de Cuidados)

Vas a la farmacia — ejecuto los 10 sprints en el siguiente turno sin detenerme. Este plan es la brújula.

---

## Sprint 1 · Fundamento: sucursales, lotes, caducidades y FEFO

**Tablas nuevas**
- `pharmacy_branches` (sucursales): nombre, direccion, rfc_emisor, telefono, activo
- `pharmacy_lots`: catalog_id, branch_id, lote, caducidad, cantidad_inicial/actual, costo_unitario_centavos, proveedor_id, compra_id, estado (activo/agotado/vencido/bloqueado)
- `pharmacy_lot_movements`: lot_id, tipo, cantidad, motivo, referencia, created_by

**Reglas**
- Trigger bloquea salidas de lotes vencidos o negativos
- Función `sugerir_lotes_fefo(catalog_id, branch_id, cantidad)` → ordena por caducidad ascendente
- `pharmacy_inventory.stock_actual` pasa a vista calculada por sucursal
- Grants: `authenticated` (RLS por rol), `service_role` (edge functions)

**UI**
- `SucursalSelector.tsx` global (header farmacia)
- `LotsManager.tsx`: timeline con colores por caducidad (verde/amarillo/naranja/rojo/gris)
- Alertas de rotación: próximos a vencer, sin movimiento >90d, sobrestock, ruptura

---

## Sprint 2 · Compras con CFDI (compu + celular) y manuales

**Tablas**
- `pharmacy_suppliers`: rfc, razón_social, contacto, días_crédito, saldo, calificación
- `pharmacy_purchases`: supplier_id, folio, fecha, subtotal/iva/total, status, tipo_origen (manual/cfdi_xml/cfdi_pdf), cfdi_uuid, xml_url, pdf_url
- `pharmacy_purchase_items`: descripción_cfdi, cantidad, precio_unit, **lote, caducidad, iva_pct** (obligatorios al confirmar)

**Edge functions**
- `parse-cfdi-xml`: extrae emisor/conceptos/UUID, mapea proveedor por RFC, sugiere match a catálogo (fuzzy + código SAT + código de barras)
- `parse-cfdi-pdf-ocr`: OCR de PDF/foto celular → UUID → consulta Facturama para XML oficial
- `create-purchase-manual`: compra sin factura, marca "pendiente CFDI" para adjuntar después

**UI**
- `PurchasesManager.tsx` con wizard 3 modos: **CFDI XML/ZIP**, **CFDI PDF/foto (celular con `capture="environment"`)**, **Manual**
- Mapeo de conceptos con "crear producto inline"
- Captura obligatoria de **lote + caducidad por partida** antes de confirmar
- Bucket `pharmacy-cfdi` (privado)

---

## Sprint 3 · Precios, márgenes y Trivago de medicamentos (competencia)

**Tablas**
- Extender `pharmacy_catalog`: costo_promedio, margen_minimo_pct, margen_objetivo_pct, precio_publico, precio_mayoreo, iva_pct, codigo_sat, codigo_barras, principio_activo, requiere_receta
- `pharmacy_price_history`: precio_anterior/nuevo, motivo, aprobado_por
- `pharmacy_competitor_prices`: competidor (farmacias_ahorro/similares/san_pablo/farmalisto/benavides/amazon), precio, url, disponibilidad, fuente (apify/manual)
- `pharmacy_price_change_requests`: precio_actual/propuesto, razón, estado (pendiente/aprobado/rechazado)

**Edge functions**
- `sync-competitor-prices` (cron 12h, Apify free): actors comunitarios de farmacias MX
- `suggest-price-adjustments` (Kari, 150 tokens): analiza costo+competencia+margen mínimo → propone ajustes
- Trigger `validate-price-margin`: impide guardar precio bajo margen mínimo salvo override admin

**UI**
- `PricingManager.tsx`: tabla con costo, precio, margen actual/mínimo, mejor competidor, sugerencia Kari, botón "Solicitar cambio"
- Comparador público `/farmacia/comparador/:sku` (tipo Trivago) para pacientes

---

## Sprint 4 · POS (Punto de Venta) físico

**Tablas**
- `pos_sessions`: cajero_id, sucursal_id, apertura/cierre, fondo_inicial, arqueo
- `pos_sales`: folio, cajero_id, cliente_id, sucursal_id, totales, método_pago, timbrada, cfdi_uuid, ticket_url
- `pos_sale_items`: catalog_id, lot_id (FEFO auto), cantidad, precio, descuento, iva
- `pos_customers`: nombre, teléfono, RFC opcional, uso_cfdi

**Edge function**
- `pos-timbrar-venta`: llama Facturama para timbrar CFDI 4.0 Ingreso (si cliente pidió factura)
- `pos-enviar-ticket`: WhatsApp/email con ticket PDF

**UI `/pos`** (interfaz tablet, muy simple)
- Izq: escáner código de barras (`@zxing/browser` + WebUSB) + búsqueda rápida
- Centro: carrito con FEFO **automático** (usuario NO elige lote)
- Der: total grande, método pago, botón "Cobrar"
- Cliente rápido (nombre+tel), toggle "¿Factura?" → RFC/uso CFDI
- Impresión térmica 58/80mm vía WebUSB + fallback PDF
- Apertura/cierre de caja con arqueo automático

---

## Sprint 5 · E‑commerce + surtido de recetas CareCentral

**Tablas**
- Extender `pharmacy_orders`: origen (pos/ecommerce/receta_carecentral/marketplace), tipo_entrega, dirección, paquetería, guía_tracking, costo_envío, receta_id, requiere_validación_farmacéutico
- `pharmacy_shipping_rates`: paquetería, zona, peso_max, precio, tiempo_entrega

**Edge functions**
- `ecommerce-checkout`: reserva lotes FEFO, cobra Stripe, dispara despacho
- `validate-prescription-order`: si el producto es controlado → verifica `receta_id` CareCentral o exige subir imagen para validación

**UI**
- `/tienda` público: catálogo, carrito, checkout (usa cuenta CareCentral si existe)
- Gate "requiere receta" con subida o vinculación
- Panel farmacia `/farmacia/pedidos`: kanban (nuevos → preparación → listos → enviados → entregados)

---

## Sprint 6 · Despacho + impresión de guías

**Tablas**
- `shipments`: order_id, paquetería, servicio, guía, tracking_url, costo, peso, dimensiones, etiqueta_pdf_url, estado, eventos_jsonb
- `shipping_addresses`: cliente, calle, cp, ciudad, estado, referencias, lat, lng

**Edge functions**
- `shipping-quote`: cotiza en Skydropx + Envia.com simultáneo, devuelve comparativa (paquetería, servicio, precio, días)
- `shipping-create-label`: crea guía en la elegida, guarda PDF etiqueta 4x6 térmica en storage
- `shipping-track-webhook`: eventos → actualiza estado y notifica cliente

**UI `/farmacia/despacho`**
- Cola de listos → cotizar → comparativa Skydropx vs Envia → elegir → generar guía → **imprimir etiqueta 4x6** (WebUSB térmica) → marcar enviado
- Tracking en vista cliente CareCentral

**Secrets**: `SKYDROPX_API_KEY`, `ENVIA_API_KEY` (los pediré al arrancar sprint 6)

---

## Sprint 7 · Clientes y Cuentas por Cobrar

**Tablas**
- `pharmacy_customers`: nombre, teléfono, email, rfc, uso_cfdi, direcciones[], límite_crédito, saldo, días_crédito, tipo (contado/crédito/mayoreo)
- `pharmacy_customer_movements`: tipo (venta/pago/nota_crédito), monto, referencia, saldo_después
- Link `pharmacy_customer_prescriptions` con `recetas` y ventas históricas

**UI `CustomersManager.tsx`**
- Vista 360°: compras, recetas, saldo, medicamentos crónicos
- Alertas Kari: "Cliente X debe reposicionar Losartán (última compra 28d, tratamiento crónico)" → WhatsApp automático (50 tokens)
- Aging CxC (0-30/30-60/60-90/>90)

---

## Sprint 8 · Pagos a proveedores + Finanzas farmacia

**Tablas**
- `pharmacy_supplier_payments`: método, comprobante_url, complemento_pago_cfdi_uuid
- `pharmacy_expenses`: categoría (renta/luz/nómina/otros), monto, cfdi_uuid, comprobante_url
- Vista materializada `pharmacy_financial_summary`

**Edge functions**
- `facturama-complemento-pago`: genera complemento CFDI al pagar factura de proveedor
- `finance-monthly-report` (Kari, 800 tokens): reporte mensual con recomendaciones

**UI `/farmacia/finanzas`**
- Flujo de caja proyectado (CxC - CxP)
- Aging pagos a proveedor + alertas "vence en X días"
- Top 10 productos por utilidad/rotación/margen
- Drill-down por producto/proveedor/categoría/sucursal
- Botón "Pagar" → registra + comprobante + complemento CFDI automático

---

## Sprint 9 · MRP — sugerencias de compra inteligentes

**Tablas**
- `pharmacy_demand_forecast`: catalog_id, sucursal_id, período, demanda_estimada, algoritmo
- `pharmacy_purchase_suggestions`: cantidad, proveedor_sugerido, razón, prioridad, costo_estimado, estado

**Edge functions**
- `mrp-calculate` (cron diario): consume histórico 90d, considera stock/mínimo/lead time/estacionalidad → prioriza rupturas > próximas a agotar > óptimo; elige proveedor por mejor precio+tiempo+calificación
- `mrp-generate-purchase-order`: convierte aprobadas en OC PDF, envía por email al proveedor

**UI `/farmacia/mrp`**
- Sugerencias agrupadas por proveedor con "Aprobar todas" / editar → genera OC PDF → envío proveedor

---

## Sprint 10 · Central de Cuidados: laboratorio a domicilio

**Tablas**
- `lab_orders`: paciente_id, estudios[], dirección, fecha_hora_toma, flebotomista_id, maquilador_id, status (solicitado/agendado/tomado/en_análisis/reportado/entregado), costo, precio_venta, cfdi_uuid
- `lab_partners`: nombre_maquilador, api_endpoint, credenciales_ref, catálogo_pruebas

**Edge functions**
- `lab-schedule-optimize`: agenda + ruta optimizada del flebotomista (Google Maps API)
- `lab-partner-sync`: recibe resultados del maquilador y los sube a `resultados_estudios` de CareCentral

**UI**
- `/lab/domicilio`: agenda + ruta + captura muestras con etiquetas QR
- Resultados llegan al expediente automáticamente
- Facturación 1-click desde la orden

---

## Elementos transversales

**Roles nuevos**
- `farmaceutico` (POS, valida recetas, no ve finanzas)
- `admin_farmacia` (todo + finanzas + compras + precios)
- `flebotomista` (solo su ruta y capturas)

**RLS**: policies por rol + `sucursal_id`. GRANT en cada CREATE TABLE (`authenticated` + `service_role`).

**Kari (motor de tokens)**
- MRP: 200 tokens · Análisis competitivo: 150 · Reporte mensual: 800 · Recordatorio cliente crónico: 50/mensaje

**Dependencias npm**
- `fast-xml-parser` (CFDI), `@zxing/browser` (código de barras POS), `react-to-print` + WebUSB (impresión térmica)

**Secrets a solicitar por sprint**
- Sprint 2: `FACTURAMA_USER`, `FACTURAMA_PASSWORD` (consulta SAT + timbrado)
- Sprint 3: `APIFY_TOKEN` (cuenta free existente)
- Sprint 4: reutiliza Facturama
- Sprint 6: `SKYDROPX_API_KEY`, `ENVIA_API_KEY`
- Sprint 10: credenciales del maquilador

---

## Orden de ejecución (arranca al aprobar este plan)

```
Sprint 1  →  lotes + FEFO + sucursales
Sprint 2  →  compras + CFDI (XML/PDF/foto/manual)
Sprint 3  →  precios + competencia + Trivago
Sprint 4  →  POS + impresión térmica
Sprint 5  →  e-commerce + surtido recetas
Sprint 6  →  despacho + guías (Skydropx + Envia)
Sprint 7  →  clientes + CxC + Kari recordatorios
Sprint 8  →  pago proveedores + finanzas + complementos CFDI
Sprint 9  →  MRP + OC automáticas
Sprint 10 →  laboratorio a domicilio
```

Cada sprint cierra con: migración aprobada, edge functions desplegadas, UI verificada, entrada en Landing/Marketing actualizada.

**Aprobá este plan y arranco Sprint 1 en el próximo turno — no me detengo hasta terminar los 10.**
