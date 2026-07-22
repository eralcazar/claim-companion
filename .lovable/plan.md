## Objetivo

En `/admin/api-keys`, dentro del aviso amarillo **"Catálogo de modelos vacío"**, mostrar el estado de la última sincronización del proveedor: fecha (relativa + absoluta en tooltip), resultado (éxito / fallo) y latencia en ms.

## Fuente de datos

Ya existe `history: AuditRow[]` cargado desde `ai_api_key_audit` (con `action`, `secret_name`, `latency_ms`, `error_message`, `note`, `created_at`). No requiere consulta ni migración adicional.

## Cambios

Archivo: `src/pages/admin/ApiKeysMaintenance.tsx`.

1. En el bloque IIFE del aviso "Catálogo de modelos vacío" (aprox. líneas 486–538), calcular:
   ```ts
   const lastSync = history.find(
     (h) => h.secret_name === s.name &&
     (h.action === "models_synced" || h.action === "models_sync_failed"),
   );
   ```
2. Renderizar debajo del párrafo de recomendación (antes del bloque de botones) una fila compacta con:
   - Ícono + etiqueta **"Última sincronización"**.
   - Badge de resultado: verde `OK` si `models_synced`, rojo `Fallo` si `models_sync_failed`, `Nunca` si no hay registro.
   - Fecha relativa (`hace X min/h/d`) con `title` = fecha ISO local.
   - Latencia `123 ms` cuando `latency_ms` esté presente.
   - Si falló, mostrar `error_message` truncado a 160 chars en línea siguiente.
   - Si nunca se sincronizó: solo el badge "Nunca" + hint "Presiona Sincronizar modelos ahora".

3. Helper local `formatRelative(iso: string)` (mm/hh/dd) — inline en el archivo, sin dependencias nuevas.

## Fuera de alcance

- No se agrega registro de sync a otras vistas.
- No se toca la sección de historial auditado (ya lo lista completo).
- No se cambia el esquema ni el edge function `sync-ai-provider-models`.

## Archivo

- `src/pages/admin/ApiKeysMaintenance.tsx` — bloque de aviso + helper.
