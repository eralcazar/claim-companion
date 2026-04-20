

## Objetivo

Permitir que el admin **cree usuarios manualmente** desde el grid (con email, contraseña inicial, nombre y roles) y **elimine usuarios** existentes. Hoy solo se pueden gestionar roles de usuarios que ya se registraron por sí mismos.

## Por qué necesita un edge function

Crear y borrar usuarios en `auth.users` requiere la **service role key** de Supabase, que nunca debe exponerse al navegador. Por eso la creación/eliminación se hace vía edge function, no con el cliente directamente.

## Cambios

### 1. Edge function `admin-users` (nueva)

`supabase/functions/admin-users/index.ts` con dos acciones:

- **`create`**: recibe `{ email, password, full_name, roles[] }`.
  - Verifica que el caller sea admin (revisa JWT + `has_role(uid,'admin')`).
  - Llama `supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`.
  - El trigger `handle_new_user` crea automáticamente `profiles` y rol `paciente`.
  - Si `roles[]` incluye otros roles, los inserta en `user_roles`. Si NO incluye `paciente`, elimina el rol paciente por defecto.
  - Devuelve el `user_id` creado.

- **`delete`**: recibe `{ user_id }`.
  - Verifica admin.
  - Bloquea borrarse a sí mismo.
  - Llama `supabase.auth.admin.deleteUser(user_id)`. Las tablas relacionadas (profiles, user_roles, broker_patients, etc.) se limpian por cascada o se borran en la propia función antes.

Configurada con `verify_jwt = true` para que llegue el JWT del admin.

### 2. UI en `UserManager.tsx`

**Botón "Nuevo usuario"** en la cabecera (junto a Descargar plantilla / Importar):
- Abre un diálogo `CreateUserDialog` con campos:
  - Nombre completo (requerido)
  - Email (requerido, validación de formato)
  - Contraseña inicial (requerida, mínimo 8 caracteres, con generador "🎲 Generar")
  - Roles (checkboxes: Admin, Broker, Paciente, Médico — Paciente marcado por defecto)
- Al guardar: invoca el edge function `admin-users` acción `create`. Toast de éxito y refresca la query `users_with_roles`.
- Muestra la contraseña generada en pantalla con botón "Copiar" para que el admin pueda compartirla.

**Botón "Eliminar"** (icono papelera) al final de cada fila:
- Confirmación con `AlertDialog`: "¿Eliminar a {nombre}? Esta acción no se puede deshacer."
- Bloqueado para el propio usuario admin actual (oculto/deshabilitado en su fila).
- Invoca edge function `admin-users` acción `delete`. Toast y refresh.

### 3. Archivos

Nuevos:
- `supabase/functions/admin-users/index.ts`
- `src/components/admin/CreateUserDialog.tsx`

Modificados:
- `src/pages/admin/UserManager.tsx` — botón "Nuevo usuario" + columna acciones
- `src/components/admin/UserRolesRow.tsx` — celda final con botón eliminar (con `AlertDialog`)
- `supabase/config.toml` — registrar la función `admin-users` (verify_jwt = true por defecto)

### 4. Seguridad

- El edge function valida con `service_role` que el caller tenga rol admin antes de cualquier acción → evita escalada de privilegios.
- No se expone la service key al cliente.
- Bloqueo explícito de auto-eliminación.
- Política RLS actual de `user_roles` y `broker_patients` ya permite a admins gestionar todo, no requiere migraciones.

## Resultado esperado

En `/admin/usuarios`:
- Nuevo botón **"Nuevo usuario"** crea usuarios completos (auth + profile + roles) en un solo paso.
- Nueva columna con icono de **papelera** elimina usuarios con confirmación.
- El grid se refresca automáticamente tras cada acción.

