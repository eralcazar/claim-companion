## Objetivo
Cuando el usuario entre a `/`, redirigir automáticamente:
- A `/dashboard` si hay sesión activa
- A `/login` si no hay sesión

## Estado actual
- `src/App.tsx` monta `Dashboard` directamente en `/` dentro de `<ProtectedRoute>`.
- **No existe la ruta `/dashboard`** — hoy el dashboard vive en `/`.
- `ProtectedRoute` ya redirige a `/login` cuando no hay usuario, pero solo para rutas protegidas.

## Cambios propuestos en `src/App.tsx`

1. Crear un nuevo componente `RootRedirect` (en el mismo archivo o en `src/components/`) que use `useAuth()`:
   - Mientras `loading` → spinner.
   - Si `user` → `<Navigate to="/dashboard" replace />`.
   - Si no → `<Navigate to="/login" replace />`.

2. Reestructurar las rutas:
   - `/` (pública, fuera de `ProtectedRoute`) → `<RootRedirect />`.
   - Mover `Dashboard` a `/dashboard` dentro del bloque `<ProtectedRoute><AppLayout/></ProtectedRoute>`.

3. Revisar y actualizar enlaces internos que apunten a `/` como "home/dashboard" (sidebar, bottom nav, logo, breadcrumbs, redirecciones post-login en `Login.tsx`) para que apunten a `/dashboard`.

## Archivos a tocar
- `src/App.tsx` — nueva ruta `/dashboard`, `RootRedirect` en `/`.
- `src/pages/Login.tsx` — cambiar `navigate("/")` por `navigate("/dashboard")`.
- `src/components/AppSidebar.tsx`, `src/components/BottomNav.tsx` y cualquier `<Link to="/">` que represente "Inicio/Dashboard" → `/dashboard`.

## Notas
- Mantener `ProtectedRoute` sin cambios; ya cubre el resto de rutas privadas.
- El `replace` en `<Navigate>` evita que `/` quede en el historial del navegador.