
Diagnóstico claro: sí se detectan coordenadas, pero hoy no siempre se registran en los campos que ya existen.

## Qué está pasando

Revisé el flujo completo y el problema principal está en `VisualEditor.tsx`:

1. En `handleDetect`, las propuestas nuevas se filtran así:
   - toma las claves ya existentes en `camposEnPagina`
   - elimina cualquier propuesta cuya `clave` ya exista

2. Luego, en `acceptAllProposals`, el guardado hace solo:
   - `insert` de nuevos registros en `campos`
   - nunca hace `update` sobre campos existentes

## Consecuencia real

Si tú ya tenías campos creados antes:
- por CSV
- manualmente
- por una detección previa

y vuelves a correr detección automática, la IA puede detectar bien las coordenadas, pero esas propuestas se descartan antes de aceptar porque la `clave` ya existe.

Entonces:
- ves cajas/propuestas durante la detección
- pero al aceptar no se actualizan los campos existentes
- por eso en el tab **Campos** sigues viendo `X%, Y%, W%, H%` vacíos

## Evidencia en el código

- `VisualEditor.tsx`:
  - `existingKeys = new Set(camposEnPagina.map((c) => c.clave))`
  - luego `raw.filter((p) => !existingKeys.has(p.clave))`
- `acceptAllProposals()`:
  - construye `rows`
  - hace `.insert(rows)`
  - no busca coincidencias para actualizar coordenadas

## Plan de corrección

### 1. Cambiar la lógica de aceptación en `VisualEditor.tsx`
Separar propuestas aceptadas en dos grupos:
- `existingMatches`: ya existe un campo con la misma `clave`
- `newRows`: no existe y sí debe insertarse

### 2. Actualizar campos existentes
Para cada match existente, guardar:
- `campo_pagina`
- `campo_x`
- `campo_y`
- `campo_ancho`
- `campo_alto`
- `label_pagina`
- `label_x`
- `label_y`
- `label_ancho`
- `label_alto`
- `seccion_id` si aplica

Así la detección automática podrá “rellenar coordenadas” sobre campos ya creados.

### 3. Mantener insert para los que no existan
Las propuestas realmente nuevas seguirán entrando como `insert`, igual que hoy.

### 4. Mejorar feedback visual
Actualizar el toast final para algo como:
- `12 campos actualizados`
- `8 nuevos + 12 actualizados`
- `0 nuevos + 15 actualizados`

Eso hará evidente que la detección no solo crea campos, también puede posicionarlos.

### 5. Ajuste opcional recomendado
Agregar una opción en el panel de propuestas:
- `Actualizar campos existentes por clave`

Esto evita dudas y deja explícito el comportamiento.

## Archivos a tocar

- `src/components/admin/VisualEditor.tsx`
  - cambiar filtro de propuestas
  - hacer `update` + `insert`
  - mejorar resumen final

## Nota importante

Hay dos warnings secundarios en consola que no explican este problema de coordenadas:
- `Badge` no usa `forwardRef`
- `DialogContent` sin `DialogTitle/Description` en algún diálogo

Conviene corregirlos después, pero no son la causa de que no veas las coordenadas registradas.

## Resultado esperado después del cambio

Cuando ejecutes detección automática y aceptes:
- si el campo ya existía, se le escribirán sus coordenadas
- si no existía, se creará
- el tab **Campos** mostrará `X%, Y%, W%, H%` llenos correctamente
