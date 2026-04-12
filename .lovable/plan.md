

## Plan: Sistema de Gestión de Seguros y Salud

Aplicación móvil-first en español para pacientes, brokers y médicos. Diseño blanco y azul, tipografía Sora + Manrope.

### Diseño
- Fondo blanco, primario azul #3B82F6, textos oscuros, tarjetas con sombras suaves
- Tipografía: Sora (títulos) + Manrope (cuerpo)
- Navegación inferior móvil (5 tabs), sidebar en desktop

### Backend (Supabase / Lovable Cloud)

**Auth**: Google + Apple OAuth, roles: admin, broker, paciente, medico

**Tablas**:
- `profiles` — nombre, fecha_nacimiento, dirección, teléfono, email
- `user_roles` — user_id, role (enum: admin, broker, paciente, medico)
- `insurance_policies` — user_id, compañía, número_póliza, fechas, estado
- `claims` — user_id, policy_id, tipo, fecha_incidente, diagnóstico, tratamiento, costo, estado
- `claim_documents` — claim_id, file_path, tipo
- `medical_records` — user_id, tipo, file_path, descripción, fecha
- `appointments` — user_id, doctor_id, fecha_hora, tipo (consulta/estudio/procedimiento), notas
- `medications` — user_id, nombre, dosis, frecuencia, fecha_inicio, fecha_fin, activo
- `broker_patients` — broker_id, patient_id (asignaciones)

**Storage**: Bucket `documents` para recibos, recetas, resultados lab

**RLS**: Pacientes ven solo sus datos, brokers ven pacientes asignados, médicos ven pacientes asignados, admin ve todo (función `has_role()` security definer)

### Pantallas

1. **Login** — Botones Google + Apple
2. **Dashboard** — Resumen: próximas citas, medicamentos hoy, reclamos recientes
3. **Perfil** — Datos personales editables
4. **Pólizas** — CRUD pólizas MetLife
5. **Nuevo Reclamo** — Wizard 4 pasos: Tipo → Datos (auto-fill) → Archivos → Revisión
6. **Historial Reclamos** — Lista con estados + descarga PDF
7. **Registros Médicos** — Subir/ver documentos
8. **Agenda** — Citas con fecha, tipo, notas, médico responsable
9. **Medicamentos** — Lista con recordatorios/notificaciones
10. **Panel Broker** — Pacientes asignados, gestionar reclamos
11. **Panel Médico** — Pacientes asignados, ver registros y citas
12. **Panel Admin** — Vista general, asignar pacientes

### PDF
- Generación cliente con jspdf: datos paciente, póliza, diagnóstico, tratamiento, costo
- Descargable desde historial

### Orden de Implementación
1. Setup Supabase (tablas, auth Google+Apple, RLS, storage)
2. Auth + roles + layout con navegación responsive
3. Perfil paciente + pólizas
4. Módulo reclamos (wizard) + subida archivos
5. Generación PDF + historial
6. Registros médicos
7. Agenda de citas (con médico responsable)
8. Recordatorios de medicamentos
9. Panel broker + panel médico
10. Panel admin básico

