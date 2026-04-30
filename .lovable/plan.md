## Problema

La ruta `/legal` está montada **fuera** del `AppLayout` en `src/App.tsx`, por lo que no muestra el sidebar ni el bottom nav. Cuando un usuario entra al Aviso Legal o de Privacidad queda atrapado sin forma visible de regresar al menú principal.

## Solución

Agregar un botón **"Volver al menú principal"** en la cabecera de `src/pages/Legal.tsx`, visible siempre, en la parte superior izquierda antes del título.

- Si el usuario está autenticado → lo lleva al Dashboard (`/`).
- Si no está autenticado (entró desde el login) → la `ProtectedRoute` lo redirigirá automáticamente al `/login`, así que el botón funciona en ambos casos.

## Cambio único

**`src/pages/Legal.tsx`**
- Importar `Link` de `react-router-dom`, `Button` de `@/components/ui/button` y el icono `ArrowLeft` de `lucide-react`.
- Insertar antes del `<header>` actual:

```tsx
<Button asChild variant="ghost" size="sm" className="mb-4">
  <Link to="/">
    <ArrowLeft className="h-4 w-4 mr-1" />
    Volver al menú principal
  </Link>
</Button>
```

No se tocan rutas, layout ni otros archivos.
