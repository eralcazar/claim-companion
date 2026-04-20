

## Objetivo

Agregar al panel Admin dos nuevas piezas:
1. **Gestor de Usuarios** — listar usuarios y asignar roles (admin / broker / paciente).
2. **Gestor de Perfiles de Acceso** — definir qué funciones de MediClaim puede ver/usar cada rol.

## Decisiones tomadas (sin preguntar)

- "usuario" en tu mensaje = `paciente` en el enum existente (`app_role: admin | broker | paciente | medico`). Mantengo los 4 roles y muestro `medico` también — no tiene sentido ocultarlo si ya existe.
- Rol = un usuario puede tener varios (ya lo soporta `user_roles`). El gestor permite marcar/desmarcar cada rol con switches.
- "Perfiles de acceso" = matriz **rol × función**. Lo guardo en una tabla nueva `role_permissions` (rol + clave de función + permitido). El sidebar y rutas leen de ahí en lugar de hardcodear `roles.includes("admin")`.

## Pieza A — Gestor de Usuarios (`/admin/usuarios`)

```text
┌──────────────────────────────────────────────────────────────┐
│ Gestor de Usuarios                          [Buscar: ____]   │
├──────────────────────────────────────────────────────────────┤
│ Usuario              │ Email             │ Roles asignados   │
│ ─────────────────────┼───────────────────┼────────────────── │
│ Erick Alcázar        │ eralcazar@...     │ [✓admin] [✓brk]   │
│                      │                   │ [☐pac] [☐med]     │
│ Juan Pérez           │ jperez@...        │ [☐adm] [☐brk]     │
│                      │                   │ [✓pac] [☐med]     │
└──────────────────────────────────────────────────────────────┘
```

- Lista todos los `profiles` con sus roles (join con `user_roles`).
- Búsqueda por nombre/email.
- Cambiar un switch hace `INSERT`/`DELETE` en `user_roles` y refresca.
- Solo accesible si `has_role(admin)`.

## Pieza B — Gestor de Perfiles de Acceso (`/admin/perfiles-acceso`)

```text
┌─────────────────────────────────────────────────────────┐
│ Perfiles de Acceso                                      │
├─────────────────────────────────────────────────────────┤
│ Función              │ admin │ broker │ paciente │ med  │
│ ─────────────────────┼───────┼────────┼──────────┼──────│
│ Inicio               │  ✓    │   ✓    │    ✓     │  ✓   │
│ Reclamos             │  ✓    │   ✓    │    ✓     │  ☐   │
│ Pólizas              │  ✓    │   ✓    │    ✓     │  ☐   │
│ Panel Broker         │  ✓    │   ✓    │    ☐     │  ☐   │
│ Panel Médico         │  ✓    │   ☐    │    ☐     │  ✓   │
│ Gestor de Formatos   │  ✓    │   ☐    │    ☐     │  ☐   │
│ Gestor de Usuarios   │  ✓    │   ☐    │    ☐     │  ☐   │
└─────────────────────────────────────────────────────────┘
```

- Matriz de switches. Cada toggle hace upsert en `role_permissions`.
- Las claves de función vienen de un array fijo en código (`AVAILABLE_FEATURES`) que coincide con las rutas/items del sidebar.

## Esquema de BD nuevo

```sql
CREATE TABLE public.role_permissions (
  role app_role NOT NULL,
  feature_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, feature_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
```

Seed con los defaults visibles en la matriz de arriba para `inicio, reclamos, polizas, formatos, agenda, medicamentos, registros, perfil, broker_panel, doctor_panel, admin_panel, format_manager, user_manager, access_manager`.

## Integración con sidebar y rutas

- Hook nuevo `usePermissions()` que carga `role_permissions` filtrado por los roles del usuario actual y devuelve `can(featureKey)`.
- `AppSidebar` reemplaza los `roles.includes("admin")` por `can("format_manager")`, etc. Si el admin desactiva una función para su rol, deja de verla. (Para evitar lock-out: el ítem `access_manager` queda **siempre visible para admin** vía guard en código.)
- `ProtectedRoute` (o un nuevo `<RequireFeature feature="...">`) protege las rutas equivalentes y redirige a `/` si no hay permiso.

## Archivos

```text
crea:  supabase/migrations/<ts>_role_permissions.sql      (tabla + RLS + seed)
crea:  src/hooks/usePermissions.ts                        (carga matriz, expone can())
crea:  src/lib/features.ts                                (lista AVAILABLE_FEATURES con label/icono/ruta)
crea:  src/pages/admin/UserManager.tsx                    (Pieza A)
crea:  src/pages/admin/AccessManager.tsx                  (Pieza B)
crea:  src/components/admin/UserRolesRow.tsx              (fila usuario + switches de roles)
crea:  src/components/admin/PermissionMatrix.tsx          (tabla rol × función)
edita: src/App.tsx                                        (rutas /admin/usuarios y /admin/perfiles-acceso)
edita: src/components/AppSidebar.tsx                      (usar can(); añadir 2 links nuevos en Admin)
```

## Lo que NO incluye

- Crear/eliminar usuarios (los crea el flujo de signup; eliminar requiere service role en edge function, lo dejamos para otra pieza si lo pides).
- Permisos a nivel de campo dentro de una página (sólo visibilidad de página/sección).
- Auditoría/historial de cambios de rol.

