

## Videoconferencia, módulo de consultorio y mapa corporal interactivo

Voy a agregar 3 capacidades nuevas al ecosistema médico: videoconsulta dentro de la agenda, un consultorio digital unificado, y un selector visual del cuerpo humano para registrar hallazgos por zona anatómica.

---

### 1. Videoconferencia en la agenda

**Cambios en la cita**:
- Nuevo campo `is_telemedicine` (boolean) y `meeting_url` (text) en la tabla `appointments`.
- Al crear/editar una cita, switch **"Consulta a distancia (videoconferencia)"**. Cuando se activa:
  - Se oculta el campo de dirección física.
  - Se autogenera un `meeting_url` único usando **Jitsi Meet** (servicio gratuito, sin API key, sin cuenta del doctor) con formato `https://meet.jit.si/mediclaim-{uuid}`.
  - El paciente y el doctor reciben el mismo link.
- **En el detalle de la cita** aparece un bloque destacado con:
  - Botón grande **"Entrar a la videoconsulta"** (abre en nueva pestaña, habilitado desde 15 min antes y hasta 2 horas después de la hora programada).
  - Botón **"Copiar link"** para compartir.
  - Aviso si se intenta entrar muy temprano o muy tarde.
- Filtro nuevo en el panel del doctor: **"Solo videoconsultas"** junto a "Solo sin receta".
- Tarjetas de cita muestran un badge **"Videoconsulta"** cuando aplique.

**Por qué Jitsi**: cero configuración, no requiere cuenta del usuario ni API keys, gratis y embebible. Si más adelante prefieren Zoom/Google Meet, lo cambiamos por integración con OAuth.

### 2. Módulo de consultorio digital

Una página unificada `/consultorio/:appointmentId` (rol médico) que arma la consulta en una sola vista — hoy todo está dispuesto en pestañas de un dialog pequeño. El nuevo consultorio reúne:

**Layout** (escritorio: 3 columnas; móvil: pestañas):
- **Columna izquierda — Paciente**: nombre, edad, foto, historial breve (últimas 5 citas, alergias, medicamentos activos, pólizas vigentes, plan de suscripción). Botón "Ver expediente completo".
- **Columna central — Consulta actual**: 
  - Datos de la cita (fecha, tipo, modalidad).
  - Si es videoconsulta: reproductor Jitsi embebido (iframe).
  - Editor de **observaciones del médico** (ya existe).
  - **Mapa corporal interactivo** (ver punto 3).
  - Acciones rápidas: "Crear receta", "Solicitar estudio", "Adjuntar documento".
- **Columna derecha — Resultados**: pestañas con recetas, estudios, documentos y observaciones de la cita en curso. Ya existen los componentes `ApptRecetasTab`, `ApptEstudiosTab`, `AppointmentDocuments` — los reusamos.

**Acceso**: desde el panel médico, cada tarjeta de cita tendrá un nuevo botón **"Abrir consultorio"**. El dialog actual de detalle se conserva como vista rápida.

### 3. Mapa corporal interactivo (anotaciones por zona anatómica)

**Tabla nueva `body_annotations`**:
- `id`, `appointment_id`, `patient_id`, `created_by`, `body_view` (frontal/posterior), `body_part` (cabeza/cuello/torso/brazo-izq/brazo-der/mano-izq/mano-der/abdomen/pelvis/pierna-izq/pierna-der/pie-izq/pie-der/espalda-superior/espalda-inferior/glúteos), `marker_x`, `marker_y` (coordenadas % sobre el SVG para pinpoint exacto), `note` (text), `severity` (leve/moderada/grave), `created_at`.
- Tabla `body_annotation_files`: `annotation_id`, `file_path`, `file_name`, `file_type`, `uploaded_by`. Bucket nuevo `body-annotations` (privado).

**Componente `BodyMapEditor`** dentro del consultorio y también disponible en el dialog de detalle de cita y en el expediente del paciente:
- SVG vectorial de figura humana con dos vistas (frontal y posterior) intercambiables con tabs.
- Cada zona anatómica es una región clickeable con hover state (resalta en azul).
- Al hacer click en una zona se abre un popover/dialog para:
  - Escribir una nota.
  - Seleccionar severidad (chip de color).
  - Adjuntar archivos (imágenes, fotos, PDFs).
  - Guardar.
- El marker queda visible como un pin de color (según severidad) en el punto exacto donde se hizo click.
- Click en marker existente: ver/editar/eliminar la anotación con sus archivos.
- Listado debajo del mapa con todas las anotaciones de la cita ordenadas por zona, con miniaturas de los archivos adjuntos.

**Permisos** (RLS):
- Médico que atiende la cita puede crear/editar/eliminar anotaciones de esa cita.
- Paciente, brokers asignados y admin pueden ver. 
- Personal con `has_patient_access` puede ver.
- Solo el creador o admin pueden eliminar.

**Vista del paciente**: en el expediente del paciente se agrega una sección **"Mapa corporal histórico"** que muestra todas las anotaciones acumuladas, filtrables por zona, fecha o severidad.

---

### Cambios técnicos resumidos

**Migración SQL**:
- `ALTER TABLE appointments ADD COLUMN is_telemedicine boolean default false, ADD COLUMN meeting_url text;`
- `CREATE TABLE body_annotations (...)` + RLS.
- `CREATE TABLE body_annotation_files (...)` + RLS.
- `INSERT INTO storage.buckets ... 'body-annotations'` privado + policies.

**Frontend nuevo**:
- `src/components/appointments/VideoMeetingBlock.tsx` — botón entrar + iframe Jitsi.
- `src/components/consultorio/BodyMapEditor.tsx` + `src/components/consultorio/BodyMapSVG.tsx` (figura humana frontal y posterior con regiones).
- `src/components/consultorio/BodyAnnotationDialog.tsx` (form con archivos).
- `src/pages/Consultorio.tsx` — vista unificada `/consultorio/:appointmentId`.
- Hook `useBodyAnnotations(appointmentId | patientId)`.

**Frontend modificado**:
- `src/pages/Appointments.tsx` — switch videoconsulta + autogenerar URL.
- `src/components/appointments/AppointmentDetailDialog.tsx` — bloque videollamada + sección mapa corporal en pestaña nueva.
- `src/pages/DoctorPanel.tsx` — filtro "Solo videoconsultas", badge en tarjetas, botón "Abrir consultorio".
- `src/pages/PatientView.tsx` — pestaña nueva "Mapa corporal".
- `src/lib/features.ts` y `src/components/AppSidebar.tsx` — feature key `consultorio` (rol médico, ruta dinámica).
- `src/App.tsx` — registrar `/consultorio/:appointmentId`.

**Sin cambios**:
- No toco recetas, estudios, ni el flujo de pagos.
- No agrego dependencias pesadas: el SVG corporal es propio (paths SVG inline), Jitsi se carga vía iframe sin SDK.

---

### Lo que NO incluye esta fase
- Grabación de la videollamada (Jitsi Meet público no la permite sin servidor propio).
- Sala de espera / autenticación de invitados.
- Reconocimiento de voz o transcripción automática de la consulta.
- Integración con Zoom/Meet/Teams (queda como mejora futura si se requiere).

