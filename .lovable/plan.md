
# Estado del roadmap CareCentral — qué falta

## Ya entregado (resumen)

**Núcleo clínico y legal**
- Expediente digital, historial médico, cirugías, alertas, odontograma, mapa corporal
- Módulos de temperatura y glucosa con gráficas
- Nutrición
- Consentimientos, derechos ARCO, validadores CURP/RFC (Sprint 1 NOM-024)
- Cadena de integridad HMAC + llaves + raíces diarias + verificación pública por token + comprobante PDF (Sprint 2 NOM-024)

**Dispositivos y monitoreo**
- Capacitor Health (Apple/Google)
- BLE directo (BP + oxímetros): wizard de emparejamiento, test de conexión, catálogo, troubleshooting, historial de emparejamientos, settings de reintentos, log de errores
- Panel de riesgo clínico, revisión de lecturas, CSV export con filtros, preferencias de notificación

**Pipeline aseguradoras (MetLife)**
- Formularios A/C/D/E con autofill desde perfil y expediente
- Firmas electrónicas paciente + médico estampadas en PDF

**Facturación CFDI**
- `cfdi_config` + `cfdi_stamps` + buckets privados
- Edge function `cfdi-timbrar` con SW Sapien sandbox + fallback simulador
- Panel `/admin/facturacion`, badge global "MODO PRUEBAS"

**Farmacia — Sprint 1 completo**
- `pharmacy_branches`, `pharmacy_lots`, `pharmacy_lot_movements`, `pharmacy_suppliers`
- FEFO (`sugerir_lotes_fefo`, `apply_lot_movement`)
- SucursalSelector + LotsManager

**Farmacia — Sprint 2 parcial**
- `pharmacy_purchases` + `pharmacy_purchase_items`
- Folio + consumo de lotes en ventas

**MCP / Agentes**: server MCP con herramientas clínicas y farmacia + log de tool calls

---

## Pendiente (en orden de ejecución)

### Farmacia — cerrar Sprint 2
- Edge functions `parse-cfdi-xml`, `parse-cfdi-pdf-ocr`, `create-purchase-manual`
- Wizard `PurchasesManager` con 3 modos (XML/ZIP, PDF/foto celular, manual)
- Captura obligatoria lote+caducidad por partida
- Bucket privado `pharmacy-cfdi`

### Sprint 3 — Precios + Trivago competencia
- Extender `pharmacy_catalog` (costo_promedio, márgenes, IVA, SAT, principio activo)
- `pharmacy_price_history`, `pharmacy_competitor_prices`, `pharmacy_price_change_requests`
- Edge `sync-competitor-prices` (Apify), `suggest-price-adjustments` (Kari), trigger de margen mínimo
- `PricingManager` + comparador público `/farmacia/comparador/:sku`

### Sprint 4 — POS físico
- `pos_sessions`, `pos_sales`, `pos_sale_items`, `pos_customers`
- Edge `pos-timbrar-venta`, `pos-enviar-ticket`
- UI `/pos` con escáner ZXing, FEFO automático, impresión térmica WebUSB

### Sprint 5 — E-commerce + surtido de recetas
- Extender `pharmacy_orders` (origen, entrega, guía, receta_id)
- `pharmacy_shipping_rates`
- `ecommerce-checkout`, `validate-prescription-order`
- `/tienda` público + panel kanban `/farmacia/pedidos`

### Sprint 6 — Despacho + guías
- `shipments`, `shipping_addresses`
- `shipping-quote` (Skydropx + Envia comparativa), `shipping-create-label`, webhook tracking
- Impresión etiqueta 4x6 térmica
- Secrets: `SKYDROPX_API_KEY`, `ENVIA_API_KEY`

### Sprint 7 — Clientes farmacia + CxC
- `pharmacy_customers`, `pharmacy_customer_movements`, link a `recetas`
- Vista 360°, aging CxC, recordatorios Kari (crónicos) por WhatsApp

### Sprint 8 — Pago proveedores + finanzas
- `pharmacy_supplier_payments`, `pharmacy_expenses`, vista `pharmacy_financial_summary`
- Edge `facturama-complemento-pago`, `finance-monthly-report`
- `/farmacia/finanzas`: flujo de caja, aging, top productos, drill-down

### Sprint 9 — MRP
- `pharmacy_demand_forecast`, `pharmacy_purchase_suggestions`
- `mrp-calculate` (cron), `mrp-generate-purchase-order` (PDF + email proveedor)
- `/farmacia/mrp`

### Sprint 10 — Laboratorio a domicilio (Central de Cuidados)
- `lab_orders`, `lab_partners`
- `lab-schedule-optimize` (Google Maps), `lab-partner-sync` de resultados
- `/lab/domicilio` con QR y ruta optimizada

### Transversales pendientes
- Roles: `farmaceutico`, `admin_farmacia`, `flebotomista`
- Sprints NOM-024 restantes (3 al 8): CIE-10, semántica FHIR, no-repudio con e.firma SAT, avisos legales, respaldo/retención 5 años, certificación
- Dependencias npm por instalar cuando toque: `fast-xml-parser`, `@zxing/browser`, `react-to-print`
- Secrets pendientes: `FACTURAMA_USER/PASSWORD`, `APIFY_TOKEN`, `SKYDROPX_API_KEY`, `ENVIA_API_KEY`, credenciales maquilador

---

## Sugerencia de próximo paso

Cerrar **Farmacia Sprint 2** (parser CFDI + wizard de compras) porque desbloquea Sprint 3 (precios/márgenes reales con costo promedio) y alimenta Sprint 8 (finanzas). Es el mayor cuello de botella actual.

¿Arranco por ahí, o prefieres saltar a POS (Sprint 4) para tener venta física demo-able cuanto antes?
