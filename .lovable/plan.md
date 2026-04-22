

## Mapa corporal editable y acceso a Consultorio digital desde la vista del paciente

Hoy `/personal/paciente/:id` tiene la pestaña "Mapa corporal" pero el editor está en modo **solo lectura** (`canEdit={false}`) y sin el selector rápido de zonas. Además, no hay forma de saltar directo al consultorio digital desde ahí.

### Problema confirmado
- En la base de datos hay 1 anotación corporal para el paciente `5cc3060c…`. Ese paciente coincide con tu sesión, así que aparece en `/consultorio` (modo libre) cuando lo seleccionás.
- Cuando hacés clic en **"Ver expediente completo"** y caés en `/personal/paciente/<otro-paciente>`, no aparece nada porque ese otro paciente no tiene anotaciones aún — y como la pestaña está en solo lectura no podés crearlas desde ahí.
- Solución: hacer la pestaña editable para médicos/admins **y** agregar un acceso directo al consultorio digital del paciente.

### Cambios

**1. `src/pages/PatientView.tsx`**
- Importar `useAuth` para leer `roles`.
- Calcular `canEditBody = roles.includes("medico") || roles.includes("admin")`.
- Pasar al `BodyMapEditor` de la pestaña "cuerpo":
  - `canEdit={canEditBody}`
  - `showQuickRegionAccess={true}` (para que el médico pueda abrir el historial moderado de cualquier zona aunque no tenga marcadores).
  - `title` cambia a `"Mapa corporal del paciente"`.
- Encabezado del paciente: agregar al lado del nombre un botón **"Consultorio digital"** (icono `Stethoscope`) visible solo si `canEditBody`, que navega a `/consultorio?paciente=<id>`.

**2. `src/pages/Consultorio.tsx` (modo libre)**
- Leer `useSearchParams()` y, si llega `?paciente=<uuid>` y existe en `assignedPatients`, autoseleccionar `freePatientId` con un `useEffect`. Así el botón de PatientView abre directo el mapa corporal editable del paciente sin tener que volver a elegirlo del selector.
- Si el `paciente` no está en la lista de asignados, igual permitir setearlo (el médico ya está viendo su expediente desde otra ruta válida).

**3. Sin cambios de DB / RLS**
- Las políticas ya permiten al médico crear/leer anotaciones por `patient_id` cuando hay relación en `patient_personnel` (que es la fuente de `useAssignedPatients`).
- Para casos donde el médico llega a `PatientView` sin estar en `patient_personnel` (ej. vía `appointments.doctor_id`), el `INSERT` puede fallar por RLS. En ese caso, el `BodyMapEditor` mostrará el toast de error real al intentar guardar. No introducimos cambios de RLS en esta iteración para no abrir acceso a más datos de lo deseado.

### Detalle de UX

```text
/personal/paciente/:id
┌─────────────────────────────────────────────┐
│ ← Volver                                     │
│                                              │
│ 👤 Juan Pérez            [🩺 Consultorio]   │  ← NUEVO botón (solo médico/admin)
│    juan@correo.com                           │
└─────────────────────────────────────────────┘
[Agenda] [Recetas] [Estudios] [Meds] [Reg] [Mapa corporal]
                                              ▲
                                  AHORA editable + selector de zona rápida
```

### Lo que NO cambia
- Esquema DB, RLS, hook `useBodyAnnotations`.
- Flujo dentro de cita (`/consultorio/:appointmentId`).
- Vista del paciente para roles no médicos sigue siendo solo lectura.

