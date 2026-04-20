
Objetivo: hacer que las coordenadas sí se reflejen claramente en el tab Campos después de la detección automática.

Diagnóstico:
- El tab Campos ya tiene columnas `X% / Y% / W% / H%` en `FieldsTable.tsx`, así que no falta la UI base.
- En la sesión se ve que esas celdas sí existen, pero en este viewport quedan muy a la derecha por el ancho de la tabla.
- Además, en `VisualEditor.tsx` la actualización de campos existentes se hace por `clave` exacta. La detección IA genera claves en MAYÚSCULAS, mientras que muchos CSV/manuales pueden tener claves en minúsculas o con formato distinto. En ese caso no actualiza el campo existente: inserta otro nuevo.

Plan

1. Corregir el match de campos en `src/components/admin/VisualEditor.tsx`
- Crear un normalizador de clave para comparar ignorando mayúsculas/minúsculas y variaciones simples de formato.
- Usar ese normalizador en:
  - el conteo de reutilizables en `handleDetect`
  - la separación `existingMatches` vs `newProposals` en `acceptAllProposals`
- Mantener la `clave` original del campo existente; solo actualizar coordenadas y sección.

2. Evitar duplicados “invisibles”
- Si una propuesta coincide por clave normalizada con un campo existente, hacer `update`, no `insert`.
- Si varias propuestas colisionan con la misma clave normalizada, aceptar solo una y reportarlo en el toast para evitar resultados confusos.

3. Hacer visibles las coordenadas en el tab Campos
- Reubicar las columnas de coordenadas para que no queden tan lejos a la derecha, o agruparlas en una columna compacta “Coords”.
- Añadir una señal visual por fila:
  - `Con coords` / `Sin coords`
  - o un resumen tipo `X: 25.5 · Y: 2.7 · W: 78.9 · H: 17.2`
- Mantener edición manual de coordenadas.

4. Mejorar feedback al aceptar propuestas
- Toast más claro:
  - `8 actualizados, 3 nuevos`
  - y si hubo coincidencias por normalización, indicarlo.
- Si se insertan nuevos por no encontrar match, dejarlo explícito para que no parezca que “no se guardó”.

5. Verificación
- Detectar sobre un formulario con campos importados por CSV en minúsculas.
- Aceptar propuestas.
- Confirmar que:
  - no se crean duplicados por diferencia de mayúsculas
  - el tab Campos muestra coordenadas visibles sin depender tanto del scroll horizontal
  - los campos previamente existentes ahora reciben `campo_x`, `campo_y`, `campo_ancho`, `campo_alto`

Archivos a tocar
- `src/components/admin/VisualEditor.tsx`
- `src/components/admin/FieldsTable.tsx`

Detalles técnicos
- El cambio principal es de lógica de matching, no de base de datos.
- No se requieren migraciones.
- La comparación debería normalizar al menos: `trim + uppercase`; idealmente también unificar separadores (`espacios/guiones` a `_`) para que la IA y el CSV hablen “el mismo idioma”.
