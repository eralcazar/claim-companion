

## Plan: Agregar campos de contacto/dirección del titular en Pólizas

**Objetivo:** Completar la sección "Datos del Asegurado Titular" en el formulario de pólizas con todos los campos de dirección, teléfonos y correo solicitados.

### Paso 1 — Migración de base de datos

Agregar 12 columnas a `insurance_policies`:

```sql
ALTER TABLE public.insurance_policies
  ADD COLUMN titular_street text DEFAULT '',
  ADD COLUMN titular_ext_number text DEFAULT '',
  ADD COLUMN titular_int_number text DEFAULT '',
  ADD COLUMN titular_postal_code text DEFAULT '',
  ADD COLUMN titular_neighborhood text DEFAULT '',
  ADD COLUMN titular_municipality text DEFAULT '',
  ADD COLUMN titular_city text DEFAULT '',
  ADD COLUMN titular_state text DEFAULT '',
  ADD COLUMN titular_country text DEFAULT 'México',
  ADD COLUMN titular_cell_phone text DEFAULT '',
  ADD COLUMN titular_landline text DEFAULT '',
  ADD COLUMN titular_intl_prefix text DEFAULT '',
  ADD COLUMN titular_email text DEFAULT '',
  ADD COLUMN titular_auth_contact boolean DEFAULT false;
```

### Paso 2 — Formulario de póliza (`src/pages/Policies.tsx`)

- Agregar los 14 campos nuevos al `EMPTY_FORM`, `openEdit()` y `saveMutation`.
- En la sección "Datos del Asegurado Titular", después de RFC, agregar los inputs:
  - Calle / Avenida
  - Número exterior
  - Número interior
  - Código postal
  - Colonia / Barrio
  - Municipio / Alcaldía
  - Ciudad / Población
  - Estado / Provincia
  - País
  - Teléfono celular
  - Teléfono fijo
  - Prefijo internacional
  - Correo electrónico
  - Autorización para recibir información (Sí/No) — usando un Select con opciones Sí/No

### Archivos a modificar
- DB migration (14 columnas nuevas)
- `src/pages/Policies.tsx` — campos en formulario del titular

