# Cierre: visibilidad de OCR y bloqueo por saldo

Completar los 3 puntos pendientes del plan de Kari + OCR para que el contador de escaneos sea visible en toda la app y el sistema bloquee subidas cuando no haya saldo.

## 1. Modal `OutOfQuotaDialog` (bloqueo en subida de PDFs)

**Archivo nuevo:** `src/components/ocr/OutOfQuotaDialog.tsx`
- Dialog de shadcn con avatar Kari, título "Sin escaneos disponibles".
- Muestra: páginas requeridas vs saldo actual (suscripción + addons).
- Botones: "Comprar paquete OCR" → navega a `/planes#ocr` · "Cancelar".

**Integración:** `src/components/estudios/ResultadosManager.tsx` (o el componente que sube PDFs de resultados)
- Antes de subir, calcular páginas del PDF en cliente con un quick scan: leer el File como ArrayBuffer y contar matches de `/Type\s*/Page[^s]/g` sobre el texto decodificado (mismo patrón que la edge function).
- Comparar contra `useOcrBalance()` (hook ya existente o crearlo leyendo `ocr_quotas`).
- Si `paginas > saldo_total` → abrir `OutOfQuotaDialog` y abortar upload.
- Si pasa, continuar con `extract-study-indicators` que descontará el saldo real server-side.

## 2. Columna "Escaneos OCR" en gestor de usuarios (admin)

**Archivo:** `src/components/admin/UserManager.tsx` (o equivalente del listado admin de usuarios)
- Añadir columna "Escaneos OCR" entre rol y acciones.
- Query: hacer join/lookup a `ocr_quotas` por `user_id` (las RLS de admin ya permiten leer).
- Mostrar badge: `{subscription_balance + addon_balance}` con color:
  - verde si > 5
  - ámbar si 1-5
  - rojo si 0
- Tooltip con desglose: "Suscripción: X · Adicionales: Y".

## 3. Tarjeta de saldo OCR en `/estudios`

**Archivo:** `src/pages/Estudios.tsx` (o `Studies.tsx`)
- Añadir `OcrBalanceCard` arriba de la lista de estudios.
- Componente nuevo `src/components/ocr/OcrBalanceCard.tsx`:
  - Icono de escáner + "Escaneos OCR disponibles: **N páginas**".
  - Desglose pequeño: "Plan Gratuito: 3 / 5 · Adicionales: 0".
  - Botón "Comprar más" → `/planes#ocr`.
  - Si saldo = 0: variante destructiva con CTA prominente.
- Usa `useOcrBalance()` con realtime (ya habilitado en `ocr_quotas`).

## Detalles técnicos

- **Hook `useOcrBalance`** (crear si no existe en `src/hooks/`): suscripción a postgres_changes en `ocr_quotas` filtrado por `user_id = auth.uid()`, retorna `{ subscription_balance, addon_balance, total, loading }`.
- **Conteo cliente de páginas PDF:** función utilitaria `src/lib/pdf-pages.ts` que recibe `File` y devuelve `number` usando el mismo regex que la edge function (consistencia 100%).
- **Sin nuevas migraciones** — todas las tablas, RLS y realtime ya están listos del paso anterior.
- **i18n:** todos los textos en español-MX, marca CareCentral, paleta teal/navy.

## Archivos a tocar

- crear `src/components/ocr/OutOfQuotaDialog.tsx`
- crear `src/components/ocr/OcrBalanceCard.tsx`
- crear `src/hooks/useOcrBalance.ts`
- crear `src/lib/pdf-pages.ts`
- editar `src/components/estudios/ResultadosManager.tsx` (preflight check)
- editar `src/components/admin/UserManager.tsx` (columna)
- editar `src/pages/Estudios.tsx` (tarjeta)
