# Plan: Fase 2 + Fase 3 (sin Google Calendar)

Las tablas ya están creadas en la migración previa. Este plan cubre **toda la UI y lógica** que falta para cerrar ambas fases. Google Calendar queda fuera; en su lugar, exportación `.ics` simple desde citas y sesiones recurrentes.

## Alcance

### Fase 2 — Procedimientos recurrentes
1. **Hook + panel de recurrencias** (`useProcedureRecurrences`, `RecurrencesPanel.tsx`)
   - Crear/editar/desactivar regla (hemodiálisis 3x/sem, quimio, rehabilitación…)
   - Selector visual de días (L–D), hora, duración, sede, médico responsable
   - Generación de RRULE a partir del UI (sin librería: builder propio simple)
2. **Sesiones individuales** (`useProcedureSessions`, `SessionsList.tsx`, `SessionForm.tsx`)
   - Listado cronológico de sesiones con badges (programada, completada, cancelada)
   - Formulario "¿Cómo me fue?": síntomas, peso pre/post, TA pre/post, complicaciones, notas
   - Materialización automática: al abrir el panel, se crean en BD las próximas 4 semanas a partir de las reglas vigentes (idempotente por `recurrence_id + scheduled_at`)
3. **Integración con agenda y expediente**
   - Nueva pestaña **"Procedimientos"** dentro de `PatientExpedienteTabs`
   - Las sesiones programadas aparecen en la agenda del paciente como bloques distintivos (color por tipo)
   - Botón "Registrar evolución" en cada sesión vencida sin reporte
4. **Exportación .ics** (`src/lib/icsExport.ts`)
   - Botón "Descargar para Google/Apple Calendar" en cada recurrencia y cita
   - Genera archivo `.ics` con VEVENT + RRULE estándar (cliente, sin edge function)

### Fase 3 — Especialidades y servicios

5. **Odontograma** (`OdontogramaPanel.tsx`, `OdontogramaSVG.tsx`, `useOdontograma`)
   - SVG interactivo con 32 piezas FDI (11–48), 5 superficies por pieza (oclusal, mesial, distal, vestibular, lingual)
   - Click en superficie → menú estados: sano, caries, obturación, corona, ausente, endodoncia, implante, fractura
   - Historial por pieza (versionado con `is_vigente`, igual que body_annotations)
   - Leyenda de colores y vista impresión
6. **Panel Nutricionista** (`NutricionPanel.tsx`)
   - Métricas: peso, talla, IMC (auto), grasa, agua, peso seco
   - Tabla "semáforo" de alimentos (verde/amarillo/rojo) usando `food_traffic`
   - Plan alimenticio simple (texto estructurado) + objetivos
   - Acceso para rol `nutricionista` y `medico`
7. **Médico a domicilio** (`HomeVisitRequestForm.tsx`, `HomeVisitsList.tsx`, `useHomeVisits`)
   - Paciente solicita: dirección (usa `address_lat/lng` si existe), urgencia (baja/media/alta), motivo, ventana horaria preferida
   - Vista médico: feed de solicitudes pendientes con filtros por zona/urgencia, aceptar/rechazar
   - Estados: pendiente → aceptada → en_camino → completada / cancelada
8. **Facturación médica** (`InvoiceForm.tsx`, `InvoicesList.tsx`, `useMedicoInvoices`)
   - Médico genera factura post-consulta: conceptos (descripción + precio), método de pago, RFC opcional
   - Folio automático (ya hecho por trigger `gen_invoice_folio`)
   - PDF descargable (HTML + `window.print()`, sin librería extra)
   - Estados: borrador → emitida → pagada / cancelada
   - Paciente ve sus facturas en una pestaña "Facturación" en su expediente

### Navegación
9. **Reorganización del menú lateral por rol activo**
   - `medico`: Agenda · Pacientes · Recetas · Procedimientos · Domicilio · Facturación · Kari
   - `odontologo` (nuevo rol): Agenda · Pacientes · Odontograma · Recetas · Facturación
   - `nutricionista`: Agenda · Pacientes · Nutrición · Kari
   - `paciente`: Inicio · Expediente · Agenda · Recetas · Domicilio · Facturas · Kari
   - Sin cambios para `admin`, `broker`, `enfermero`, `farmacia`, `laboratorio`

## Detalles técnicos

**Materialización de sesiones (cliente)**
```ts
// src/lib/rrule.ts (mini parser propio)
// Soporta FREQ=WEEKLY/DAILY + BYDAY=MO,WE,FR + INTERVAL
expandRecurrence(rule, from, to) → Date[]
```
Al montar `SessionsList`, expandir cada `procedure_recurrences` vigente del paciente para los próximos 28 días y hacer `upsert` con `onConflict: 'recurrence_id,scheduled_at'`.

**Permisos / RLS** (ya en migración previa)
- Cada quien edita solo lo propio (`created_by = auth.uid()`), todo el equipo clínico autorizado puede ver vía `has_patient_access`.
- `audit_logs` ya cubre todas las nuevas tablas.

**Exportación .ics**
```ts
// Sin librería; genera string VCALENDAR válido
buildICS({ uid, summary, dtstart, duration, rrule? }): Blob
```

**Odontograma**
- Estado guardado por `(patient_id, tooth_fdi, surface)` con `is_vigente=true`. Al cambiar, marca el anterior como `superseded_by` el nuevo.
- Mismo patrón que `body_annotations` para mantener histórico.

**Sin nuevas dependencias.** Todo con React + shadcn + Tailwind existentes.

## Archivos a crear/editar

**Crear (~20):**
- `src/hooks/`: `useProcedureRecurrences.ts`, `useProcedureSessions.ts`, `useOdontograma.ts`, `useHomeVisits.ts`, `useMedicoInvoices.ts`, `useNutricion.ts`
- `src/lib/`: `rrule.ts`, `icsExport.ts`
- `src/components/procedimientos/`: `RecurrencesPanel.tsx`, `RecurrenceForm.tsx`, `SessionsList.tsx`, `SessionForm.tsx`
- `src/components/odontologia/`: `OdontogramaPanel.tsx`, `OdontogramaSVG.tsx`, `ToothEditor.tsx`
- `src/components/nutricion/`: `NutricionPanel.tsx`, `FoodTrafficTable.tsx`
- `src/components/domicilio/`: `HomeVisitRequestForm.tsx`, `HomeVisitsList.tsx`, `HomeVisitCard.tsx`
- `src/components/facturacion/`: `InvoiceForm.tsx`, `InvoicesList.tsx`, `InvoicePrint.tsx`

**Editar:**
- `src/components/expediente/PatientExpedienteTabs.tsx` → +Procedimientos, +Odontograma, +Nutrición, +Facturas
- `src/components/layout/Sidebar.tsx` (o equivalente) → menús por rol activo
- `src/pages/`: nuevas rutas `/procedimientos`, `/odontograma`, `/nutricion`, `/domicilio`, `/facturacion`
- `src/App.tsx` → registrar rutas

## Lo que NO entra en esta fase
- Sync bidireccional con Google/Apple Calendar (se reemplaza con `.ics`)
- Pagos en línea de facturas (Stripe queda para fase posterior si lo pides)
- Notificaciones push de sesiones próximas (queda al sistema de recordatorios existente)

¿Apruebo y empiezo a construir?
