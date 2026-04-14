

## Plan: Mostrar tipo de reclamo en la lista de "Mis Reclamos"

Agregar una etiqueta visible del tipo de reclamo en cada tarjeta de la página `/reclamos`.

### Cambio en `src/pages/Claims.tsx`

En cada `<Card>`, junto al Badge de status, agregar un segundo `<Badge>` que muestre el tipo de reclamo con etiquetas legibles:

- `reembolso` → "Reembolso"
- `procedimiento_programado` → "Proc. Programado"

Se colocará al lado del diagnóstico o debajo de la línea de la aseguradora, usando una variante de color distinta para diferenciarlo del status.

### Archivo a modificar
- `src/pages/Claims.tsx` — agregar Badge con tipo de reclamo en cada tarjeta

