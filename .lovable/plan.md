# Sprint 2 — Integridad criptográfica y no repudio

## Objetivo
Cadena SHA-256 encadenada e inmutable sobre `medical_records`, `recetas` y `estudios_solicitados`, con gestión de llaves rotables, verificación bajo demanda y comprobante PDF exportable por el paciente.

## Diseño del hash chain (a confirmar antes de codificar)

**Orden de encadenamiento**: cronológico global por tabla (`created_at ASC, id ASC`). Cada tabla tiene su propia cadena independiente. Un `daily_root` diario agrupa los tips de las 3 cadenas para publicación externa.

**Cálculo por registro**:
```
payload_hash = SHA256(canonical_json(fields_relevantes))
record_hash  = SHA256(prev_hash || payload_hash || key_id || signed_at_iso)
signature    = HMAC-SHA256(record_hash, secret_key[key_id])
```
- `prev_hash`: `record_hash` del registro anterior de la misma tabla; `'GENESIS'` si es el primero.
- `canonical_json`: JSON con llaves ordenadas alfabéticamente, sin espacios, excluyendo campos volátiles (`updated_at`, `signature`, `record_hash`, `prev_hash`, `key_id`, `signed_at`).
- `key_id`: llave activa al momento; rotación no re-firma el pasado (append-only).

**Inmutabilidad**: trigger `BEFORE UPDATE` prohíbe cambiar `record_hash`, `prev_hash`, `signature`, `key_id`, `signed_at` una vez seteados. Cambios al payload generan un nuevo registro-versión, nunca modifican en sitio.

## Cambios de esquema

**Nueva tabla `integrity_keys`** (gestión de llaves)
- `key_id` (text, PK, ej. `k-2026-07`), `algorithm` ('HMAC-SHA256'), `status` ('active'|'retired'), `activated_at`, `retired_at`, `created_by`.
- Secret vive en `INTEGRITY_KEY_<KEY_ID>` como secret; nunca en DB.
- RLS: solo admin lee metadata.

**Nueva tabla `integrity_daily_roots`**
- `day` (date, PK), `medical_records_tip`, `recetas_tip`, `estudios_tip`, `daily_root` (SHA256 de los 3 tips + día previo), `published_at`, `published_ref` (opcional, URL/tx externa).

**Columnas añadidas a `medical_records`, `recetas`, `estudios_solicitados`**
- `prev_hash text`, `payload_hash text`, `record_hash text`, `key_id text REFERENCES integrity_keys`, `signed_at timestamptz`, `signature text`.
- Índice `(created_at, id)` para orden estable.

## Lógica (funciones y triggers)

- `public.compute_record_hash(table_name, row jsonb)` → security definer, retorna `{payload_hash, record_hash, prev_hash, key_id, signed_at}`. Firma HMAC se aplica en edge function (necesita el secret).
- Trigger `BEFORE INSERT`: calcula `prev_hash` + `payload_hash` + `record_hash`, setea `key_id` activo y `signed_at`. La `signature` HMAC se rellena de forma asíncrona por edge function `sign-pending-records` (para no exponer el secret al postgres).
- Trigger `BEFORE UPDATE`: rechaza modificar campos de integridad; para el resto de campos, marca el row como necesitando nueva versión (por ahora solo bloquea y obliga a insertar nueva versión desde la app).

## Edge functions

- `sign-pending-records` (cron cada 5 min): lee registros con `signature IS NULL`, firma HMAC con la llave activa, actualiza `signature`.
- `verify-record-integrity` (invocada desde UI): recibe `{table, id}`; recomputa payload_hash, valida `record_hash = SHA256(prev_hash||payload_hash||key_id||signed_at)`, valida signature con secret de `key_id`, valida continuidad hacia atrás hasta genesis o hasta `checkpoint` (últimos 500 para performance). Retorna `{valid, broken_at?, chain_length_checked}`.
- `close-daily-integrity-root` (cron 23:59): calcula tips y `daily_root`, inserta en `integrity_daily_roots`.
- `integrity-certificate-pdf`: genera PDF con hash raíz del día, cadena relevante al paciente (records suyos), metadatos de llaves usadas, timestamp UTC. Firmado con la llave activa.

## UI

- `src/components/integrity/IntegrityBadge.tsx`: badge + botón "Verificar" en cada card/detalle de `medical_records`, `recetas`, `estudios_solicitados`. Colores: verde (verificado), gris (pendiente firma), rojo (roto).
- Integración en `MedicalRecords.tsx`, `Recetas.tsx` (`RecetaCard`), `Estudios.tsx` (`EstudioCard`).
- Botón "Descargar comprobante de integridad" en Expediente del paciente → invoca `integrity-certificate-pdf`.
- Página admin `/admin/integridad`: estado de la cadena por tabla, `daily_roots` recientes, llaves activas/retiradas, botón "Rotar llave".

## Orden de implementación

1. Migración: `integrity_keys`, `integrity_daily_roots`, columnas nuevas en las 3 tablas, triggers de cálculo y bloqueo de UPDATE, RLS y GRANTs.
2. Seed llave inicial `k-2026-07` + secret `INTEGRITY_KEY_k-2026-07` vía `generate_secret`.
3. Backfill: script que calcula hashes para registros históricos en orden cronológico (una sola vez).
4. Edge functions: `sign-pending-records`, `verify-record-integrity`, `close-daily-integrity-root`, `integrity-certificate-pdf`.
5. Cron jobs (pg_cron): firma cada 5 min, root diario 23:59.
6. UI: badge + verificación + botón PDF + página admin.

## Decisiones pendientes de confirmar

1. **Orden cronológico global por tabla** (propuesto) vs por-paciente. Global es más estricto pero verificar la cadena completa es más costoso. Recomiendo global con checkpoints cada 500 registros.
2. **HMAC vs firma asimétrica (Ed25519)**. HMAC es más simple y rápido; Ed25519 permite verificación pública sin exponer secreto (mejor para auditoría externa/COFEPRIS). Recomiendo empezar con HMAC y migrar a Ed25519 en Sprint 7.
3. **Publicación externa del `daily_root`**: OpenTimestamps (gratis, Bitcoin) vs solo interno por ahora. Recomiendo solo interno en este sprint; OpenTimestamps en Sprint 4.

¿Le doy tal cual, o ajustas algo de esas 3 decisiones antes?
