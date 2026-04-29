## Contexto

Tienes razón: cuando unificamos el Expediente Digital del paciente, dejamos el **Consultorio Digital** del médico a medias. Hoy en `src/pages/Consultorio.tsx` el médico solo ve:

- Mapa corporal
- Recetas / Estudios / Documentos de la cita (tabs reducidos en columna derecha)
- Observaciones, pólizas, medicamentos activos (resumen)

Le **faltan** dentro de la misma vista: Medicamentos (gestión), Recetas (histórico completo del paciente), Estudios (histórico), Tendencias, Presión Arterial, Oxigenación SpO2 y Registros Médicos — exactamente los mismos módulos que ya están unificados en el Expediente Digital del paciente.

## Objetivo

Que el **médico, al abrir el Consultorio Digital de un paciente** (ya sea desde una cita o en modo libre `/consultorio?paciente=...`), tenga acceso al **Expediente Digital completo del paciente** dentro de la misma pantalla, sin tener que salir a otra ruta.

## Cambios

### 1. Nuevo bloque "Expediente del paciente" en `src/pages/Consultorio.tsx`

Agregar debajo del Mapa Corporal (modo cita) y debajo del selector de paciente (modo libre) un componente `<PatientExpedienteTabs patientId={patientId} canEdit={isDoctor} />` con tabs:

- Medicamentos
- Recetas (histórico completo del paciente, no solo de la cita)
- Estudios (histórico completo)
- Tendencias
- Presión Arterial
- Oxigenación (SpO2)
- Registros Médicos

### 2. Refactor de `src/pages/ExpedienteDigital.tsx`

Extraer la lógica de tabs a un componente reutilizable `src/components/expediente/PatientExpedienteTabs.tsx` que acepte:

```ts
{ patientId: string; canEdit?: boolean; defaultTab?: string }
```

`ExpedienteDigital.tsx` (vista del paciente) lo seguirá usando con `patientId = user.id`. El Consultorio lo usará con el `patientId` del paciente atendido.

### 3. Ajustar páginas hijas para aceptar `patientId` por prop

Las páginas `Medications`, `Recetas`, `Estudios`, `Tendencias`, `PresionArterial`, `OxygenSaturation`, `MedicalRecords` actualmente leen al usuario actual del `AuthContext`. Hay que permitir un override:

- Si recibe prop `patientId`, usa ese id para queries/mutations en lugar del `user.id`.
- Si no, comportamiento actual (paciente viendo lo suyo).

Esto se hace de forma incremental: las pages exportan también un componente "embebible" (`MedicationsView({ patientId, canEdit })`, etc.), y la page actual lo invoca con su propio `user.id`. El `PatientExpedienteTabs` invoca los `*View` con el `patientId` del paciente.

### 4. Permisos / RLS

Las RLS ya permiten al médico leer/escribir datos del paciente vía `has_patient_access()` (existe en BD) o vía la cita asignada. No requiere migración. Se valida `canEdit = isDoctor` para deshabilitar formularios cuando aplique (médico no asignado en modo libre ⇒ solo lectura).

### 5. UX en Consultorio

- Modo **cita**: el bloque del Expediente queda como `<Card>` colapsable a ancho completo (col-span-12) bajo el grid actual, para no romper la cuadrícula de 3 columnas.
- Modo **libre**: se renderiza al seleccionar paciente, debajo del Mapa Corporal.

## Archivos

**Crear**
- `src/components/expediente/PatientExpedienteTabs.tsx`

**Editar**
- `src/pages/Consultorio.tsx` — montar `PatientExpedienteTabs`
- `src/pages/ExpedienteDigital.tsx` — usar el nuevo componente compartido
- `src/pages/Medications.tsx`, `Recetas.tsx`, `Estudios.tsx`, `Tendencias.tsx`, `PresionArterial.tsx`, `OxygenSaturation.tsx`, `MedicalRecords.tsx` — aceptar `patientId` opcional

**Sin cambios**: rutas, navegación, BD, RLS.

## Fuera de alcance (siguiente fase)

- Facturama / CFDI
- Módulo tipo Uber (Bienestar Móvil mobility)
- Más ajustes visuales 4T

¿Apruebas para implementar?
