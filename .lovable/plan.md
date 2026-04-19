

## Plan: Mejoras Perfil + Pólizas + Wizard Dinámico de Reclamos

Trabajo extenso. Lo entrego en 3 fases independientes, cada una funcional por sí sola.

---

### FASE 1 — Perfil + Pólizas (rápido, base para autocompletado)

**Migración SQL**

`profiles` añadir columnas:
- `estado_civil text`, `giro_negocio text`
- `es_pep boolean default false`, `cargo_pep text`
- `tipo_identificacion text`, `numero_identificacion text`, `vigencia_identificacion date`
- `telefono_celular text`

`insurance_policies` añadir columnas:
- `numero_certificado text`
- `tipo_contratacion text default 'individual'`
- `deducible numeric default 0`, `coaseguro_porcentaje numeric default 0`, `tope_coaseguro numeric default 0`
- `agente_nombre text`, `agente_clave text`, `agente_telefono text`, `agente_estado text`

**`src/lib/constants.ts`** (nuevo) — extraer `ESTADOS_MX`, `ASEGURADORAS` (10 fijas), `ESTADOS_CIVILES`, `TIPOS_IDENTIFICACION` para reutilización.

**`src/pages/Profile.tsx`**
- Después de Ocupación: Estado civil (Select), Giro negocio (Input), PEP (RadioGroup) + Cargo PEP condicional.
- En Contacto: agregar Teléfono celular (separado de `phone`).
- Nueva sección "Identificación Oficial": Tipo (Select), Número (Input), Vigencia (date input).

**`src/pages/Policies.tsx`**
- `company` pasa de Input → Select con las 10 aseguradoras.
- Nuevos campos: No. Certificado, Tipo contratación, Deducible, Coaseguro %, Tope coaseguro.
- Nueva sección "Datos del Agente" (4 campos, Estado = Select 32 estados).
- Tarjeta muestra No. Certificado debajo del No. Póliza.

---

### FASE 2 — Arquitectura del wizard dinámico

**Migración SQL — tabla nueva `claim_forms`**
- `id`, `user_id`, `policy_id`, `insurer text`, `form_code text` (A-H), `tramite_type text`
- `data jsonb`, `status text` ('draft' | 'submitted')
- `folio text`, `pdf_path text`
- `created_at`, `updated_at`
- RLS: usuarios CRUD propios, admins ALL, brokers SELECT asignados (mismo patrón que `claims`).
- Trigger `update_updated_at_column`.
- Secuencia/función `gen_folio(insurer, code)` para consecutivo mensual.

**Estructura nueva `src/components/claims/forms/`**
```
registry.ts            // map (insurer, tramite) → FormDefinition
types.ts               // FormDefinition, Section, Field
FormRenderer.tsx       // renderiza secciones/campos por definición
shared/
  SignatureCanvas.tsx  // firma HTML5 + Limpiar
  DynamicTable.tsx     // filas dinámicas (gastos, médicos, documentos)
  AutofillBanner.tsx   // alerta azul
  validators.ts        // RFC, CURP, CLABE, requeridos
definitions/
  formA-informe-medico.ts
  formB-aviso-accidente.ts
  formC-solicitud-reembolso.ts
  formD-programacion.ts
  formE-consentimiento.ts
  formF-identificacion-allianz.ts
  formG-carta-marsh.ts
  formH-informe-reclamante.ts
```

**Mapa aseguradora → trámite → formulario** (registry):
- METLIFE: A, C, D, E
- AXA, MAPFRE: A, C, D
- ALLIANZ: A, B, F, G
- GNP, INBURSA, SEGUROS MONTERREY: A, B
- BANORTE: A, H
- BBVA, PLAN SEGURO: A

**`src/pages/NewClaim.tsx`** se reescribe:
- Paso 1: tipo de trámite (Reembolso / Prog. cirugía / Prog. medicamentos / Prog. servicios / Indemnización / Reporte hospitalario) + selección de póliza.
- Detecta `insurer + tramite` → carga `FormDefinition` → genera pasos dinámicos.
- Autofill `useEffect` al seleccionar póliza: llena solo campos vacíos desde profile + policy. Banner azul visible.
- Botones por paso: Anterior, Siguiente (valida), Guardar borrador. Último paso: Resumen + Generar PDF.
- Validación en tiempo real (RFC, CURP, CLABE, requeridos) bloquea avance.
- Página actual queda como `NewClaimLegacy.tsx` sin link (respaldo 1 versión).
- `EditClaim.tsx` sin cambios.

---

### FASE 3 — Definiciones de formularios + PDF + borradores

**8 definiciones declarativas** (A-H) con todas las secciones especificadas: campos, tipos, condicionales (`showWhen`), validaciones, autofill mappings.

**Características transversales**:
- Tabla dinámica de gastos (Form C): hasta 10 filas, totales en tiempo real.
- Médicos interconsultantes (Form A): 1 default + agregar hasta 3.
- Firmas: Canvas HTML5 con touch/mouse, exporta a base64 PNG.
- Sello médico: upload imagen al bucket `documents`.
- Edad calculada desde DOB.
- Máscaras RFC/CURP/CLABE.

**Borrador**:
- Autosave con debounce 1.5s al cambiar `data`, `status='draft'`.
- Lista de borradores en `/reclamos` (pestaña "Borradores").

**Generación PDF** (jsPDF + autoTable):
- Folio: `{SIGLAS}-{CODE}-{AAAAMM}-{NNNN}` (ej. `GNP-IM-202504-0001`) generado vía función SQL al pasar a `submitted`.
- Header: nombre aseguradora (izq), nombre formulario (centro), folio + fecha (der).
- Secciones con títulos, tablas con bordes, áreas de firma con imágenes embebidas.
- Footer: `Documento generado por MediClaim · Folio: {folio} · {fecha}`.
- Sube a bucket `documents/claim-forms/{user_id}/{folio}.pdf`, guarda `pdf_path`.
- Estado pasa a `submitted`. Botones: Descargar / Volver a Mis Reclamos.

---

### Decisiones por defecto (sin preguntar)
- Autofill **solo llena campos vacíos** (no sobrescribe ediciones).
- Wizard nuevo reemplaza `/reclamos/nuevo`. Legacy queda como respaldo sin link.
- `EditClaim` y reclamos viejos no se tocan.
- Logos de aseguradoras: placeholder con nombre en texto (no se incluyen logos oficiales por derechos).
- Texto legal de consentimiento (Form E) y autorizaciones (Form C): plantillas genéricas en español.

### Fuera de alcance
- Editor dinámico de formularios ya enviados.
- OCR de documentos, e.firma SAT, envío automático a aseguradoras.
- Panel admin/broker para revisar formularios nuevos.

### Entregables por fase
| Fase | Archivos clave | Resultado visible |
|------|----------------|-------------------|
| 1 | Migración + Profile.tsx + Policies.tsx + constants.ts | Campos nuevos guardables |
| 2 | Migración claim_forms + estructura forms/ + NewClaim.tsx | Wizard dinámico funcional con autofill |
| 3 | 8 definitions + PDF + borradores | Sistema completo end-to-end |

