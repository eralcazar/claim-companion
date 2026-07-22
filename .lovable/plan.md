## Objetivo

Añadir un botón **"Solicitar prueba de este dispositivo"** en la ficha del dispositivo (`DeviceDetailSheet`) para que un usuario pida al equipo CareCentral que verifique un modelo aún no probado, y permitir adjuntar evidencia (foto/PDF) cuando la prueba se realice.

## Alcance de datos

Nueva tabla `public.device_test_requests`:

- `id`, `user_id` (auth.uid), `device_id` (texto, ID del catálogo estático), `device_name`, `region`, `firmware`, `app_version`, `note`
- `status`: enum textual `pending | in_review | verified | rejected` (default `pending`)
- `evidence_url` (texto, opcional — path en storage)
- `resolved_by` (uuid), `resolved_at` (timestamptz), `resolution_note`
- `created_at`, `updated_at` con trigger

Bucket privado nuevo `device-test-evidence` para subir la evidencia. Políticas: el dueño (`user_id`) puede leer/subir su carpeta; admin puede leer todo.

### RLS y grants

- `GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_test_requests TO authenticated;` + `GRANT ALL ... TO service_role;`
- RLS: el usuario ve/crea/edita solo sus solicitudes; admin (`has_role(auth.uid(),'admin')`) ve y actualiza todas (para pasar a `in_review`, `verified` o `rejected` y subir evidencia oficial).
- El campo `status` no lo puede cambiar el usuario a `verified` (chequeo por policy `WITH CHECK`).

## UI

**En `DeviceDetailSheet.tsx`:**
- Botón **"Solicitar prueba"** (icono `FlaskConical`). Visible siempre que el dispositivo NO esté `verified` ni `incompatible`. Estado marcado como **probable** ya cumple.
- Al hacer clic: abre un `Dialog` con formulario (región, firmware/versión app, nota corta) → `insertMutation` en `device_test_requests`.
- Debajo del botón, si existe una solicitud del usuario para este `device_id`, mostrar badge de estado (`Pendiente / En revisión / Verificada / Rechazada`) y, si `evidence_url` existe, un enlace "Ver evidencia".

**Nueva página admin `/admin/device-test-requests`** (`src/pages/admin/DeviceTestRequests.tsx`):
- Lista de todas las solicitudes con filtros por status.
- Cada fila: cambiar estado, subir evidencia al bucket privado (`device-test-evidence/{request_id}/…`), guardar `resolution_note`.
- Registrar entrada en `AppSidebar` bajo la sección admin.

## Archivos

Nuevos:
- Migración SQL (tabla + bucket + policies).
- `src/hooks/useDeviceTestRequests.ts` — list/create/update, signed URL para evidencia.
- `src/components/ble/RequestDeviceTestDialog.tsx` — formulario.
- `src/pages/admin/DeviceTestRequests.tsx` — bandeja admin.

Modificados:
- `src/components/ble/DeviceDetailSheet.tsx` — botón + badge de estado + evidencia.
- `src/App.tsx` — ruta `/admin/device-test-requests`.
- `src/components/layout/AppSidebar.tsx` — enlace admin.

## Fuera de alcance

- No se toca el catálogo estático (`compatibleDevices.ts`). La verificación admin queda registrada en la tabla, no reescribe el status del catálogo.
- No se notifica por email/push al admin (queda para siguiente iteración).
