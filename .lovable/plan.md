

## Diagnóstico: por qué no se importan las coordenadas

Hice un trazado completo del flujo **detectar → aceptar → guardar en BD**. Las coordenadas SÍ se calculan correctamente en `VisualEditor.tsx` líneas 329-337, pero hay un **problema de contrato entre el edge function y el cliente** que está causando que se descarten antes de llegar al insert.

### La causa real

En `supabase/functions/detect-form-fields/index.ts` línea 194:

```ts
r.w >= 0.3 && r.w <= 100 && r.h >= 0.3 && r.h <= 100
```

El validador `validRect` exige que **ancho y alto sean mínimo 0.3%**. Pero Gemini muy a menudo devuelve casillas (checkbox, firma corta, números pequeños) con `h` o `w` redondeados a `0` o `0.1`. Cuando eso pasa:

1. `validRect(p.campo)` → `false`
2. Línea 206: `.filter((p) => p.campo)` → **elimina toda la propuesta** (no solo el rect, el campo entero).

Resultado: propuestas con coords pequeñas **nunca llegan al cliente**, así que al "Aceptar" no hay nada que importar para esos campos. Y los que sí llegan, llegan correctos.

### Segundo problema (silencioso)

El validador rechaza también si `x + w > 101` o `y + h > 101`. Gemini frecuentemente devuelve `x=95, w=8` (suma 103) en campos del borde derecho — todos esos también se descartan en silencio.

### Tercer problema (UX)

Cuando el filtro descarta propuestas, el usuario solo ve el toast `"X campos detectados"` con un número menor del real, o `"No se detectaron campos nuevos"` sin saber que sí los hubo pero fueron filtrados. No hay log de cuántas se cayeron.

## Solución propuesta

### 1. `supabase/functions/detect-form-fields/index.ts`

- **Bajar mínimos** a `w >= 0.1` y `h >= 0.1` (un checkbox mide ~0.4% en una hoja A4 a 1600px).
- **Clamp en lugar de rechazar** cuando `x+w > 100`: ajustar `w = min(w, 100-x)`. Igual para `y+h`.
- **Logear** cuántas propuestas se descartaron y por qué (visible en los logs del edge function).
- Devolver además del `propuestas` un contador `descartadas: number` para que el cliente lo muestre.

### 2. `src/components/admin/VisualEditor.tsx`

- En `handleDetect` (línea 257): mostrar toast con el conteo de descartadas si lo hay (`"12 campos · 3 descartados por coords inválidas"`).
- En `acceptAllProposals`: añadir un `console.warn` si alguna propuesta aceptada tiene `campo.w === 0` o `campo.h === 0` (defensa en profundidad).

### 3. Verificación

Después del fix, al detectar y aceptar una página, los campos insertados deben aparecer en el editor visual con sus rectángulos en la posición correcta. Si quieres, puedes confirmar con esta query (read-only):

```sql
SELECT clave, campo_pagina, campo_x, campo_y, campo_ancho, campo_alto
FROM campos
WHERE formulario_id = '<id>' AND origen = 'auto_ia'
ORDER BY orden DESC LIMIT 20;
```

Hoy probablemente verás `campo_ancho` y `campo_alto` con valores razonables solo en algunos, o filas faltando completamente respecto a lo que la IA detectó visualmente.

## Archivos a tocar

- `supabase/functions/detect-form-fields/index.ts` — relajar `validRect`, clamp de bordes, log de descartes, devolver contador.
- `src/components/admin/VisualEditor.tsx` — toast con descartes + warn defensivo.

Sin migraciones de BD. Sin cambios en `acceptAllProposals` (su lógica de inserción es correcta).

