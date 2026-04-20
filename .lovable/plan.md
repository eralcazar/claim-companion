

## Objetivo

Crear el **esquema BD + seed** para Claim Companion v2.0 **adaptado a las tablas existentes** (`profiles`, `insurance_policies`, `claim_forms`). Solo migración SQL — sin frontend todavía.

## Adaptación clave

Los documentos asumen tablas nuevas (`perfiles_usuario`, `polizas_usuario`, `aseguradoras`, etc.). Aquí ya existen equivalentes funcionales:

| Doc v2.0 | Proyecto actual | Acción |
|---|---|---|
| `aseguradoras` | (no existe) — pero `insurance_policies.company` ya guarda nombre | **Crear** como catálogo |
| `formularios` | (no existe) — hoy en `registry.ts` hardcoded | **Crear** + seedear los 23 |
| `secciones` | (no existe) | **Crear** vacía (sin seed por ahora) |
| `campos` | (no existe) | **Crear** vacía (coordenadas en otro paso) |
| `mapeo_perfiles` / `mapeo_polizas` / `mapeo_siniestros` | (no existe) | **Crear** + seedear con columnas reales de `profiles` e `insurance_policies` |
| `perfiles_usuario` | `profiles` ✅ | **Reusar** |
| `polizas_usuario` | `insurance_policies` ✅ | **Reusar** |
| `siniestros_usuario` | `claims` ✅ | **Reusar** |
| `registros` | `claim_forms` ✅ | **Reusar** (ya tiene `data jsonb`, `pdf_path`, `status`) |

## Esquema a crear

```sql
-- Catálogo de aseguradoras (10 filas)
CREATE TABLE public.aseguradoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,        -- ALLIANZ, AXA, ...
  slug text NOT NULL UNIQUE,          -- allianz, axa, ...
  carpeta_storage text NOT NULL,      -- ALLIANZ, PLAN SEGURO, ...
  color_primario text DEFAULT '#3B82F6',
  activa boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Catálogo de formularios (23 filas)
CREATE TABLE public.formularios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aseguradora_id uuid NOT NULL REFERENCES public.aseguradoras(id) ON DELETE CASCADE,
  nombre text NOT NULL,               -- informe_medico, aviso_accidente
  nombre_display text NOT NULL,       -- "Informe Médico"
  storage_path text NOT NULL UNIQUE,  -- formatos/ALLIANZ/informe_medico.pdf
  total_paginas int DEFAULT 1,
  total_campos_estimado int DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Secciones (vacía por ahora)
CREATE TABLE public.secciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden int DEFAULT 0,
  pagina int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Campos con coordenadas (vacía por ahora)
CREATE TABLE public.campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  seccion_id uuid REFERENCES public.secciones(id) ON DELETE SET NULL,
  clave text NOT NULL,
  etiqueta text,
  descripcion text,
  origen text NOT NULL DEFAULT 'auto' CHECK (origen IN ('auto','manual')),
  tipo text NOT NULL DEFAULT 'texto' CHECK (tipo IN (
    'texto','numero','fecha','checkbox','radio','select',
    'firma','textarea','telefono','curp','rfc','diagnostico_cie'
  )),
  -- coordenadas label
  label_pagina int, label_x float, label_y float, label_ancho float, label_alto float,
  -- coordenadas campo respuesta
  campo_pagina int, campo_x float, campo_y float, campo_ancho float, campo_alto float,
  -- mapeo a tablas reales del proyecto
  mapeo_perfil text REFERENCES public.mapeo_perfiles(id) ON DELETE SET NULL,
  mapeo_poliza text REFERENCES public.mapeo_polizas(id) ON DELETE SET NULL,
  mapeo_siniestro text REFERENCES public.mapeo_siniestros(id) ON DELETE SET NULL,
  requerido boolean DEFAULT false,
  longitud_max int,
  patron_validacion text,
  valor_defecto text,
  opciones jsonb,
  orden int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (formulario_id, clave)
);
CREATE INDEX ON public.campos(formulario_id);
CREATE INDEX ON public.campos(seccion_id);

-- Catálogos de mapeo (apuntan a columnas reales de profiles/insurance_policies/claims)
CREATE TABLE public.mapeo_perfiles (
  id text PRIMARY KEY,                -- 'NOMBRE_PACIENTE', 'CURP'
  nombre_display text NOT NULL,
  columna_origen text NOT NULL,       -- nombre real en profiles, ej. 'full_name'
  tipo text DEFAULT 'texto'
);
CREATE TABLE public.mapeo_polizas (
  id text PRIMARY KEY,
  nombre_display text NOT NULL,
  columna_origen text NOT NULL,       -- nombre real en insurance_policies
  tipo text DEFAULT 'texto'
);
CREATE TABLE public.mapeo_siniestros (
  id text PRIMARY KEY,
  nombre_display text NOT NULL,
  columna_origen text NOT NULL,       -- nombre real en claims
  tipo text DEFAULT 'texto'
);
```

## RLS

- `aseguradoras`, `formularios`, `secciones`, `campos`, `mapeo_*`: **SELECT abierto a authenticated** (catálogos), **INSERT/UPDATE/DELETE solo admin** vía `has_role(auth.uid(),'admin')`.

## Seed

1. **10 aseguradoras** con `carpeta_storage` exacto (incluye espacios `PLAN SEGURO`, `SEGUROS MONTERREY`).
2. **23 formularios** con `storage_path`, `total_paginas` y `total_campos_estimado` según TECH_REFERENCE (BANORTE/informe_reclamante.PDF en mayúsculas respetado).
3. **Mapeos** con las columnas reales:
   - `mapeo_perfiles` (~15 filas): `NOMBRE_COMPLETO→full_name`, `CURP→curp`, `RFC→rfc`, `FECHA_NACIMIENTO→date_of_birth`, `SEXO→sex`, `EMAIL→email`, `TELEFONO→phone`, `CALLE→street`, `NUMERO→street_number`, `COLONIA→neighborhood`, `MUNICIPIO→municipality`, `ESTADO→state`, `CP→postal_code`, `OCUPACION→occupation`, `NACIONALIDAD→nationality`.
   - `mapeo_polizas` (~12 filas): `NUMERO→policy_number`, `ASEGURADORA→company`, `FECHA_INICIO→start_date`, `FECHA_FIN→end_date`, `SUMA_ASEGURADA→suma_asegurada`, `DEDUCIBLE→deducible`, `COASEGURO→coaseguro_porcentaje`, `CERTIFICADO→numero_certificado`, `TITULAR_NOMBRE→titular_first_name`, `AGENTE_NOMBRE→agente_nombre`, `AGENTE_TELEFONO→agente_telefono`, `AGENTE_CLAVE→agente_clave`.
   - `mapeo_siniestros` (~6 filas): `FECHA→incident_date`, `DIAGNOSTICO→diagnosis`, `TRATAMIENTO→treatment`, `CAUSA→cause`, `FECHA_PRIMERA_ATENCION→first_attention_date`, `NOTAS→notes`.

## Lo que NO incluye este paso

- Frontend (gestor `/admin/gestor-archivos`, editor de coordenadas, formulario dinámico).
- Carga de los 524 campos con coordenadas — las tablas quedan listas pero vacías. Se llenarán después (manualmente desde el gestor o por seed adicional si decides exportar del otro proyecto).
- Reemplazo del flujo `claim_forms` actual — convive sin romperlo.

## Archivos

```text
crea: supabase/migrations/<ts>_v2_schema_aseguradoras_formularios_campos.sql
```

Tras aprobar, en modo default ejecuto la migración (10 aseguradoras + 23 formularios + ~33 mapeos seedeados) y luego avanzamos a la siguiente pieza (gestor o formulario dinámico).

