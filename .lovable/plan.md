# Armonizar colores de la barra lateral con la app

## Problema
La barra lateral usa fondo **navy oscuro** (`#0F172A`) mientras que el resto de la app usa fondo claro blanco azulado con acentos teal. Esto rompe la unidad visual de CareCentral.

## Solución propuesta: Sidebar clara con acentos teal
Cambiar la paleta del sidebar para que sea coherente con el resto: fondo casi blanco, texto navy, ítem activo en teal de marca.

### Cambios en `src/index.css` (modo claro `:root`)

| Variable | Antes | Después |
|---|---|---|
| `--sidebar-background` | navy `222 47% 11%` | blanco azulado `210 40% 98%` |
| `--sidebar-foreground` | claro `210 40% 98%` | navy `222 47% 11%` |
| `--sidebar-primary` | teal `173 80% 40%` | teal (igual) |
| `--sidebar-primary-foreground` | blanco | blanco (igual) |
| `--sidebar-accent` (hover/activo bg) | `222 40% 18%` | teal suave `173 70% 94%` |
| `--sidebar-accent-foreground` | claro | teal oscuro `173 80% 30%` |
| `--sidebar-border` | `222 30% 22%` | `214 32% 91%` (mismo que `--border`) |
| `--sidebar-ring` | teal | teal (igual) |

### Cambios en modo oscuro (`.dark`)
Mantener sidebar oscura pero alinear mejor con el `--background` oscuro de la app (ya está cercano, ajustar para que coincidan exactamente).

### Detalle visual en `src/components/AppSidebar.tsx`
- El header de la sidebar tiene un wrapper con `bg-sidebar` dentro del gradiente teal del logo. Con el nuevo fondo claro funciona igual de bien (el gradiente teal sigue resaltando el logo).
- El botón "Cerrar sesión" usa `text-destructive` — sigue legible sobre fondo claro.
- El badge de OCR y Kari mantienen sus variantes — siguen visibles.

## Resultado esperado
Sidebar blanca con bordes sutiles, logo destacado en gradiente teal, ítem activo resaltado en teal claro con texto teal oscuro. Toda la app comparte la misma sensación clara, limpia y de salud digital.

## Archivos a modificar
- `src/index.css` (variables CSS de sidebar en `:root` y `.dark`)
