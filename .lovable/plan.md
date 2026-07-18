# Mejorar navegación y completar catálogo de especialidades

## Estado actual detectado

**Especialidades cargadas en BD (17):** Anestesiología, Cardiología, Cirugía General, Dermatología, Ginecología, Medicina General, Medicina Interna, Neurología, Oftalmología, Oncología, Otorrinolaringología, Pediatría, Psiquiatría, Radiología, Traumatología, Traumatología y Ortopedia, Urología.
→ Faltan varias comunes en México y hay un duplicado ("Traumatología" vs "Traumatología y Ortopedia").

**Sidebar (`AppSidebar.tsx`):**
- Grupo "Principal" con 11 items en una sola lista larga.
- Módulos de mediciones (Presión, Glucosa, SpO₂, Temperatura, Tendencias) NO están en el sidebar — sólo accesibles desde el Expediente.
- "Historial de salud" y "Dispositivos BLE" perdidos en un grupo "Ayuda" al final.
- Sin sub-agrupación visual → cuesta escanear.

**Bottom nav móvil (`BottomNav.tsx`):**
- Sólo 4 destinos (Inicio, Solicitudes, Agenda, Perfil) + FAB Kari.
- Sin acceso rápido a Expediente ni Salud.

## Cambios propuestos

### 1. Reorganizar sidebar por dominios
Reagrupar `mainItems` en secciones con etiqueta:

- **Inicio**: Panel de Paciente
- **Salud** *(nuevo grupo)*: Expediente Digital, Historial de salud, Presión arterial, Glucosa, SpO₂, Temperatura, Tendencias, Nutrición, Historial médico
- **Atención**: Agenda, Médico a domicilio, Procedimientos, Odontograma
- **Seguros**: Solicitudes, Pólizas, Formatos, Facturación *(para roles aplicables)*
- **Dispositivos**: Dispositivos BLE compatibles
- **Cuenta**: Perfil, Mis accesos

Mantener grupos por rol existentes (Broker, Médico, Enfermería, Laboratorio, Farmacia, Admin) y el footer (Kari, Planes, Suscripción, OCR, Legal, Salir) sin cambios.

Agregar entradas a `mainItems` (o nuevo `saludItems`) para las rutas ya existentes: `/presion`, `/glucosa` (verificar ruta real), `/oxygen-saturation`, `/temperatura`, `/tendencias`, `/historial-salud` con sus feature keys correspondientes.

### 2. Bottom nav móvil más útil
Cambiar de 4 a 5 tabs (2 izq + FAB + 2 der):
- Inicio · Expediente · **Kari (FAB)** · Agenda · Perfil

Mover Solicitudes a un menú "Más" accesible desde Perfil o al header, ya que en móvil el usuario paciente entra más a su expediente que a solicitudes.

### 3. Ampliar catálogo de especialidades
Migración `INSERT ... ON CONFLICT DO NOTHING` para agregar las faltantes comunes en México y eliminar el duplicado:

Agregar: Alergología e Inmunología, Angiología, Cirugía Cardiovascular, Cirugía Plástica y Reconstructiva, Cirugía Pediátrica, Endocrinología, Gastroenterología, Geriatría, Hematología, Infectología, Medicina del Deporte, Medicina Familiar, Medicina del Trabajo, Nefrología, Neonatología, Neumología, Neurocirugía, Nutriología Clínica, Odontología, Ortopedia (unificar con Traumatología), Patología, Psicología Clínica, Reumatología, Terapia Física y Rehabilitación, Urgencias Médicas.

Consolidar "Traumatología" + "Traumatología y Ortopedia" → dejar sólo **"Traumatología y Ortopedia"** (borrar duplicado si no está referenciado; si lo está, hacer UPDATE de referencias antes).

## Detalles técnicos

- Archivos a tocar: `src/components/AppSidebar.tsx`, `src/components/BottomNav.tsx`.
- Nuevas feature keys si hace falta en `src/lib/features.ts` (`presion_arterial`, `oxygen_saturation`, `tendencias` ya existen).
- Migración SQL: `INSERT INTO especialidades (nombre, activa) VALUES (...) ON CONFLICT (nombre) DO NOTHING;` + limpieza del duplicado con validación previa de FKs en `medico_especialidades` / `professional_specialties`.
- Sin cambios de RLS ni de lógica de negocio.

## Preguntas para confirmar antes de implementar

1. ¿Apruebas el nuevo agrupamiento del sidebar (Inicio / Salud / Atención / Seguros / Dispositivos / Cuenta)?
2. ¿Ok cambiar el bottom nav móvil a **Inicio · Expediente · Kari · Agenda · Perfil** (quitando Solicitudes de la barra inferior)?
3. ¿Ok con la lista ampliada de especialidades y consolidar el duplicado de Traumatología?
