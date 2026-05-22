
# Plan de evoluci贸n CareCentral

Es much铆simo trabajo, as铆 que lo dividimos en **6 fases independientes** que se pueden aprobar / implementar una a la vez. Tras aprobar el plan, te pregunto cu谩l fase arrancamos primero (o si lo hacemos todo seguido).

---

## Reglas transversales (aplican a todas las fases)

- **Permisos de edici贸n**: cada registro guarda `created_by`. Solo el creador puede editar/borrar el suyo; los dem谩s profesionales lo ven en modo lectura. Admin override.
- **Audit log universal**: tabla `audit_logs` (`actor_id, table_name, record_id, action, before, after, at`). Trigger gen茅rico aplicado a TODAS las tablas cl铆nicas (mapa, recetas, estudios, signos, historial, citas, alertas, cirug铆as, procedimientos, nutrici贸n).
- **Paciente puede ver el log** de su propio expediente (qui茅n y cu谩ndo edit贸).
- **UI 100% espa帽ol**, paleta Teal/Navy/Cyan, mobile-first.

---

## FASE 1 鈥� N煤cleo cl铆nico: historial, cirug铆as, alertas, logs

### 1.1 Mapa corporal versionado
- A帽adir a `body_annotations`: `is_vigente boolean default true`, `superseded_by uuid`, `superseded_at timestamptz`.
- Editar = crear nueva versi贸n y marcar la anterior como no vigente (no se borra).
- UI: timeline por regi贸n con autor, fecha/hora y badge "Vigente" / "Hist贸rico".
- Filtros: "Solo vigentes" (default) / "Ver historial completo".
- El paciente puede agregar y editar **sus propias** anotaciones (ya habilitado); ahora tambi茅n las marca como vigentes/no.

### 1.2 Historial de cirug铆as y procedimientos
- Nueva tabla `surgeries` (`patient_id, fecha, nombre, hospital, cirujano, tipo_anestesia, complicaciones, notas, vigente`).
- Nueva tabla `procedures_log` para procedimientos puntuales (biopsias, infiltraciones, etc.).
- Vista en Expediente 鈫� nueva pesta帽a "Cirug铆as e intervenciones".

### 1.3 Panel de alertas m茅dicas
- Tabla `medical_alerts` (`patient_id, created_by, tipo, severidad: info|warning|critical, mensaje, ref_table, ref_id, activa, expires_at`).
- Cualquier profesional (medico/enfermero/nutricionista/laboratorio) crea alertas sobre presi贸n, oxigenaci贸n, temperatura, glucosa, estudios OCR/manuales.
- Auto-alertas: trigger que crea alerta cuando un signo cae fuera de rango.
- **Panel global de alertas** visible en todos los paneles profesionales (badge en bottom nav + sidebar + drawer dedicado).

### 1.4 Audit logs
- Tabla `audit_logs` + funci贸n `log_change()` + triggers en todas las tablas cl铆nicas.
- Pesta帽a "Historial de cambios" en cada secci贸n del expediente.

### 1.5 Recetas 鈥� fixes UX
- Vista **lista** (en lugar de cards) como default.
- Checkbox **"Tomar indefinidamente"** 鈫� `dias_a_tomar = null` y badge "Indefinido".
- **Quitar `precio_aproximado`** del formulario y de la card/lista.

---

## FASE 2 鈥� Agenda + procedimientos recurrentes + Google Calendar

### 2.1 Procedimientos recurrentes
- Citas tipo `procedimiento` con `recurrence_rule` (RRULE simple: diaria/semanal/X veces por semana).
- Ejemplo: "Hemodi谩lisis Lu/Mi/Vi 9:00".
- Nueva pesta帽a en expediente: **"Procedimientos recurrentes"** con calendario + lista de sesiones.
- Cada sesi贸n permite registrar "C贸mo me fue": s铆ntomas, peso pre/post, presi贸n, observaciones (link al mapa corporal).

### 2.2 Sync Google Calendar (per-user OAuth)
- Tabla `user_google_tokens` (refresh_token cifrado).
- Edge function `google-calendar-sync` (oauth callback + push de appointments + pull opcional).
- Apple Calendar 鈫� fase posterior (requiere Sign in with Apple + CalDAV, lo dejamos documentado).

---

## FASE 3 鈥� Nuevas especialidades y paneles

### 3.1 Nutricionista
- Ya existe rol `nutricionista` y `nutricion_panel`. Falta:
  - Agregar **Perfil de nutricionista** (similar a `MedicoEditor`): especialidad, c茅dula, biograf铆a, foto.
  - Integrar pesta帽a "Nutrici贸n" dentro del **Consultorio** del m茅dico (no solo en panel propio).

### 3.2 Odontolog铆a
- Nuevo rol `odontologo` en enum `app_role`.
- Panel `/odontologia` con: pacientes, agenda, **odontograma** (mapa dental SVG con piezas 11-48, estados: sano/caries/extra铆do/corona/endodoncia).
- Perfil de odont贸logo.
- Especialidad "Odontolog铆a" en cat谩logo.
- Permisos en `role_permissions` y `plan_role_features`.

### 3.3 M茅dico a domicilio
- Tipo de cita `domicilio` + flag `requires_transport`.
- Flujo paciente: "Solicitar m茅dico a domicilio" 鈫� selecciona especialidad + direcci贸n + s铆ntomas 鈫� notifica a m茅dicos disponibles.
- Tabla `home_visit_requests` con estados pendiente/aceptada/en camino/completada.

### 3.4 Facturaci贸n para m茅dicos
- Tabla `medico_invoices` (cita, monto, RFC paciente, uso CFDI, estado, pdf_url).
- Por ahora: PDF generado localmente con datos fiscales (no timbrado CFDI real, eso requerir铆a PAC externo 鈥� lo documentamos como integraci贸n futura).

---

## FASE 4 鈥� Voz + Kari sugerencias

### 4.1 Control por voz (Web Speech API)
- Hook `useVoiceInput(lang="es-MX")`.
- Bot贸n micr贸fono en formularios de: presi贸n, oxigenaci贸n, temperatura, glucosa, estudios.
- Para estudios: gram谩tica gu铆a "diga: estudio, valor, rango de referencia"; parser regex en cliente.

### 4.2 Kari sugerencias contextuales
- Edge function `ai-kari-suggestions` que recibe `patient_id` y arma contexto con: padecimientos activos, cirug铆as, procedimientos recurrentes, estudios recientes, alertas.
- Devuelve sugerencias accionables ("considerar control de creatinina por hemodi谩lisis", "alergia a penicilina activa antes de recetar").
- Widget "Sugerencias de Kari" en Consultorio y Expediente.

---

## FASE 5 鈥� Redise帽o de navegaci贸n por rol

- Auditor铆a actual: sidebar y bottom nav muestran lo mismo para todos seg煤n features. Mejora:
  - **Sidebar contextual por `active_role`**: secciones agrupadas y priorizadas seg煤n el profesional (M茅dico: Consultorio 鈥� Agenda 鈥� Alertas 鈥� Recetas; Enfermer铆a: Signos 鈥� Alertas 鈥� Pacientes asignados; Nutricionista: Plan alimenticio 鈥� Pacientes 鈥� Sem谩foro; Odont贸logo: Odontograma 鈥� Agenda; Paciente: Inicio 鈥� Expediente 鈥� Agenda 鈥� Kari).
  - Bottom nav m贸vil con 5 atajos por rol (no fijos).
  - Breadcrumbs en p谩ginas profundas.
  - Buscador global (Cmd+K) con pacientes/citas/estudios.
  - Selector "Cambiar de rol" m谩s prominente cuando el usuario tiene varios roles.

---

## FASE 6 鈥� Otras mejoras detectadas que te pueden servir

(propuestas que surgieron al analizar lo que pediste 鈥� decides cu谩les entran)

- **Vacunas** (tabla + carnet digital).
- **Plan de tratamiento** activo (consolidado: medicamentos + procedimientos + dieta + recordatorios).
- **Compartir expediente** con QR temporal (urgencias).
- **Modo offline** para signos vitales (PWA + cola de sync).
- **Exportar expediente completo a PDF** firmado.
- **Recordatorios push** para procedimientos recurrentes.
- **Telemetr铆a de adherencia** (% de medicamentos tomados a tiempo).

---

## Detalle t茅cnico resumido

```text
DB nuevas tablas:
  surgeries, procedures_log, medical_alerts, audit_logs,
  user_google_tokens, home_visit_requests, medico_invoices,
  odontograma_states, nutricionista_profiles

DB modificaciones:
  body_annotations + (is_vigente, superseded_by, superseded_at)
  appointments + (recurrence_rule, parent_id, requires_transport)
  receta_items: precio_aproximado deprecated en UI
  app_role enum + 'odontologo'
  role_permissions + plan_role_features: nuevas features

C贸digo:
  Hook gen茅rico useAuditLog, useVoiceInput
  Componentes: AlertsDrawer, SurgeryTimeline, OdontogramaSVG,
    RecurrenceEditor, ProcedureSessionLog, RecetaListView,
    NutricionistaEditor, KariSuggestionsCard
  Edge functions: google-calendar-sync, ai-kari-suggestions,
    medico-invoice-pdf, home-visit-dispatch

OAuth Google Calendar: per-user (no connector compartido).
```

---

驴Aprobamos el plan y arrancamos por la **Fase 1** (n煤cleo cl铆nico + recetas fixes), que es la m谩s cr铆tica y desbloquea las dem谩s?
