

## Objetivo

Fase 1 de MediClaim v2.0: **Gestor de Recetas** y **Gestor de Estudios**, integrados con la Agenda. Crear/listar/editar desde panel médico y panel admin; el paciente ve en modo lectura. Sin lector IA en esta fase (queda para fase 2 con Lovable AI Gemini 2.5 Pro).

## 1. Migración de base de datos

**Nuevas tablas (todas con RLS):**

- `recetas`
  - `id`, `appointment_id` (nullable, FK lógica a `appointments`), `patient_id` (uuid, paciente), `doctor_id` (uuid, médico que prescribe), `created_by` (uuid).
  - Medicamento: `medicamento_nombre` (text), `dosis` (numeric), `unidad_dosis` (text: mg/ml/UI/mcg/...), `cantidad` (int, dosis por toma), `via_administracion` (text: oral/inyectable/tópica/inhalatoria/oftálmica/ótica), `dias_a_tomar` (int).
  - Frecuencia: `frecuencia` (enum: cada_4h, cada_6h, cada_8h, cada_12h, cada_24h, cada_48h, semanal, otro), `frecuencia_horas` (int, solo si "otro").
  - Detalles: `indicacion`, `observaciones`, `marca_comercial`, `es_generico` (bool), `precio_aproximado` (numeric).
  - Estado: `estado` (enum: activa/completada/cancelada), `created_at`, `updated_at`.

- `estudios_solicitados`
  - `id`, `appointment_id` (nullable), `patient_id`, `doctor_id`, `created_by`.
  - `tipo_estudio` (text con set predefinido: sangre/orina/heces/cultivo/citologia/radiografia/ecografia/tomografia/resonancia/mamografia/endoscopia/electrocardiograma/electroencefalograma/espirometria/audiometria/test_esfuerzo/biopsia/test_alergia/densitometria/otro), `descripcion`, `cantidad` (int default 1).
  - `indicacion`, `observaciones`, `preparacion`, `laboratorio_sugerido`, `prioridad` (enum: baja/normal/urgente), `ayuno_obligatorio` (bool), `horas_ayuno` (int).
  - `estado` (enum: solicitado/en_proceso/completado/cancelado), `created_at`, `updated_at`.

- `resultados_estudios`
  - `id`, `estudio_id` (FK a estudios_solicitados), `patient_id`, `pdf_path` (storage), `pdf_name`, `fecha_resultado` (date), `laboratorio_nombre`, `notas`, `uploaded_by`, `created_at`.

- `indicadores_estudio` (preparado para fase 2 IA, pero ya capturable manualmente)
  - `id`, `resultado_id`, `patient_id`, `nombre_indicador`, `codigo_indicador`, `valor` (numeric), `unidad`, `valor_referencia_min`, `valor_referencia_max`, `es_normal` (bool), `flagged` (bool), `created_at`.

**Storage bucket nuevo:** `estudios-resultados` (privado), para PDFs/imágenes de resultados.

**RLS (resumen):**
- `recetas`/`estudios_solicitados`: 
  - SELECT: paciente (`patient_id = auth.uid()`), médico (`doctor_id = auth.uid()`), admin (`has_role admin`), broker asignado.
  - INSERT/UPDATE: médico asignado, admin, broker asignado. Paciente NO crea ni edita.
  - DELETE: admin y el médico que las creó.
- `resultados_estudios` e `indicadores_estudio`: heredan visibilidad del estudio (EXISTS sobre `estudios_solicitados`).
- Storage `estudios-resultados`: políticas equivalentes vía path `{patient_id}/{estudio_id}/...`.

**Permisos rol_permissions:** agregar feature keys nuevos `recetas` y `estudios` para admin (true) y medico (true). Paciente con `recetas` y `estudios` true (solo lectura, controlado por UI).

## 2. Frontend — nuevos archivos

**Hooks:**
- `src/hooks/useRecetas.ts` — list/create/update/delete recetas con React Query, filtros por paciente/médico/appointment/estado.
- `src/hooks/useEstudios.ts` — análogo para `estudios_solicitados`.
- `src/hooks/useResultadosEstudio.ts` — list/upload/delete resultados de un estudio.

**Componentes:**
- `src/components/recetas/RecetaForm.tsx` — diálogo crear/editar. Campos: paciente (PatientSelect ya existente, reusar), cita opcional (AppointmentSelect nuevo), medicamento, dosis+unidad, cantidad, vía, días, frecuencia (radio + input "otro"), indicación, observaciones, estado.
- `src/components/recetas/RecetaCard.tsx` — card con resumen + acciones (editar/duplicar/cancelar/descargar).
- `src/components/recetas/recetaPdf.ts` — genera PDF con jsPDF (ya está instalado): logo opcional, datos médico, datos paciente, lista de medicamentos formateada, observaciones, firma.
- `src/components/estudios/EstudioForm.tsx` — diálogo crear/editar. Tipo (Select con iconos), descripción, cantidad, prioridad, indicación, observaciones, preparación, ayuno+horas, laboratorio sugerido.
- `src/components/estudios/EstudioCard.tsx` — card con tipo, prioridad, estado, acciones.
- `src/components/estudios/ResultadosManager.tsx` — sub-panel dentro del detalle de estudio: subir PDF (drag & drop), listar resultados, captura manual de indicadores (tabla editable: nombre, valor, unidad, rango min/max → calcula `es_normal`).
- `src/components/appointments/AppointmentSelect.tsx` — combobox de citas del paciente (cuando se crea receta/estudio independiente y se quiere ligar opcionalmente).

**Páginas:**
- `src/pages/Recetas.tsx` — ruta `/recetas`. Header con "+ Nueva receta", filtros (paciente, estado, fecha), tabla/grid de recetas. Para médico: ve las que él prescribió + filtro por paciente. Para admin: todas.
- `src/pages/Estudios.tsx` — ruta `/estudios`. Análogo. Pestañas: "Solicitados" / "Con resultado" / "Completados".

**Integración con detalle de cita:**
- En `AppointmentDetailDialog.tsx`: agregar pestañas (Tabs) **Detalles / Recetas / Estudios / Documentos**. Las pestañas Recetas y Estudios listan las ligadas al `appointment.id` y muestran botón "+ Nueva" (solo si `canEditDoctorObservations` o admin/broker). Documentos = lo que ya existe hoy.

**Sidebar y rutas:**
- `src/lib/features.ts`: añadir `recetas` y `estudios` a `FeatureKey`.
- `src/components/AppSidebar.tsx` y `BottomNav.tsx`: nuevos items "Recetas" (Pill icon) y "Estudios" (FlaskConical icon), gateados por permiso.
- `src/App.tsx`: registrar rutas `/recetas` y `/estudios` dentro de `ProtectedRoute`.

## 3. Reglas y comportamientos clave

- **Paciente** ve sus recetas y estudios en `/recetas` y `/estudios` en modo solo lectura (sin botón "Nueva", sin editar). Puede descargar PDF de receta y descargar PDF de resultado.
- **Médico** crea/edita/cancela recetas y estudios donde `doctor_id = auth.uid()` o desde dentro de una cita que él atiende. Puede subir resultados a estudios que solicitó.
- **Admin** todo permitido.
- Al crear desde el detalle de una cita: `appointment_id`, `patient_id` (= cita.user_id), `doctor_id` (= cita.doctor_id) se pre-llenan.
- Al crear desde `/recetas` o `/estudios` (independiente): paciente seleccionable, cita opcional.
- Estado por defecto: `activa` (recetas), `solicitado` (estudios).
- **Notificaciones**: al crear receta/estudio, insertar `notifications` para el paciente con link al detalle.

## 4. Detalles técnicos

- Generación PDF de receta: jsPDF + autoTable (ya hay patrón en `generateClaimPDF.ts`). Estructura: encabezado, datos paciente, tabla de medicamentos con dosis/frecuencia/duración, observaciones, línea de firma con nombre+cédula del médico (de `medicos` table o `profiles`).
- `medications` actual queda intacta. Más adelante podemos hacer un import de medications → recetas pero no en esta fase para no romper datos.
- Triggers: reusar `update_updated_at_column()` para `updated_at`.
- Validación en formularios con Zod (ya hay patrón).
- Para `frecuencia = otro` se requiere `frecuencia_horas > 0`.
- Resultados: storage path `{patient_id}/{estudio_id}/{timestamp}_{filename}`.

## 5. Archivos a tocar

**Migración SQL** (nueva): tablas recetas, estudios_solicitados, resultados_estudios, indicadores_estudio + bucket + RLS + insert role_permissions.

**Creados:**
- `src/hooks/useRecetas.ts`, `useEstudios.ts`, `useResultadosEstudio.ts`
- `src/components/recetas/{RecetaForm,RecetaCard,recetaPdf}.tsx`
- `src/components/estudios/{EstudioForm,EstudioCard,ResultadosManager}.tsx`
- `src/components/appointments/AppointmentSelect.tsx`
- `src/pages/Recetas.tsx`, `src/pages/Estudios.tsx`

**Modificados:**
- `src/components/appointments/AppointmentDetailDialog.tsx` — Tabs internas (Detalles/Recetas/Estudios/Documentos).
- `src/lib/features.ts` — nuevos FeatureKey.
- `src/components/AppSidebar.tsx`, `src/components/BottomNav.tsx` — items nuevos.
- `src/App.tsx` — rutas nuevas.

## Resultado esperado

- Médico abre una cita → pestaña "Recetas" → "+ Nueva receta" → llena medicamento, dosis, frecuencia, días → guarda → aparece en la cita y en `/recetas` del paciente. Botón "Descargar PDF" genera la receta firmada.
- Análogo para "Estudios": el médico solicita un hemograma con preparación "Ayuno 8h", el paciente lo ve en `/estudios`. Cuando regresa con el resultado, el médico (o admin) sube el PDF y captura manualmente los indicadores en una tabla; el paciente ve el resultado descargable.
- Paciente solo lee y descarga; nunca crea ni edita.
- Lector IA y gráficos de tendencias quedan listos para fase 2 (la tabla `indicadores_estudio` ya está, así que solo hace falta agregar la edge function con Lovable AI y un componente de gráfico).

