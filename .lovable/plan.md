

## Objetivo

Permitir comparar hasta 3 indicadores en un mismo gráfico en `/tendencias`, con doble eje Y (izquierdo y derecho) y un tercero compartiendo eje. Modo de comparación opcional que coexiste con la vista actual de tarjetas individuales.

## Cambios

### 1. Nuevo componente: `IndicadorCompareChart`

Archivo: `src/components/tendencias/IndicadorCompareChart.tsx`.

- Props: `indicadores: TendenciaIndicador[]` (1 a 3).
- Renderiza un `LineChart` grande (~h-96) de recharts con:
  - Eje X compartido: fechas combinadas y ordenadas de todos los indicadores.
  - **Eje Y izquierdo**: primer indicador (color primario azul).
  - **Eje Y derecho**: segundo indicador (color naranja/secundario).
  - **Tercer indicador**: comparte eje Y derecho con el segundo (color violeta) — se indica en la leyenda.
  - Cada línea con su propio `dataKey` (`valor_0`, `valor_1`, `valor_2`).
  - Tooltip combinado mostrando fecha + valor de cada indicador con su unidad.
  - Leyenda clickeable para ocultar/mostrar líneas.
- Construcción del dataset: hace merge por fecha — cada punto del array final tiene `{ fechaLabel, fechaIso, valor_0?, valor_1?, valor_2? }`. Si un indicador no tiene medición en esa fecha, queda `undefined` y recharts lo conecta con `connectNulls`.

### 2. Actualizar `src/pages/Tendencias.tsx`

- Añadir state `modo: 'individual' | 'comparar'` (default `'individual'`).
- Añadir state `seleccionados: string[]` (claves normalizadas de indicadores, máx 3).
- Añadir botones de tabs/toggle al inicio: "Vista individual" / "Comparar indicadores".
- En modo `'comparar'`:
  - Renderizar un panel de selección con multi-select (checkboxes o chips) listando todos los indicadores disponibles (`filteredByRango`).
  - Limitar selección a 3; al intentar seleccionar un cuarto, mostrar toast "Máximo 3 indicadores".
  - Si `seleccionados.length === 0`, mostrar mensaje "Selecciona 1 a 3 indicadores para comparar".
  - Si hay seleccionados, renderizar `<IndicadorCompareChart indicadores={...} />`.
  - Mantener el filtro de búsqueda y rango de fechas activos sobre la lista de selección.
- En modo `'individual'`: comportamiento actual (grid de `IndicadorTrendChart`).
- El selector de paciente, búsqueda y rango siguen funcionando en ambos modos.

### 3. Detalles UX

- Chips seleccionados se muestran arriba del gráfico con su color asignado y botón ✕ para quitar.
- Color por posición: 0 = `hsl(var(--primary))` (azul), 1 = naranja `hsl(25 95% 55%)`, 2 = violeta `hsl(265 80% 60%)`.
- Etiquetas de eje Y muestran el nombre del indicador y su unidad (ej. "Glucosa (mg/dL)").
- Leyenda y tooltip mantienen consistencia de colores con los chips.
- Si un indicador seleccionado se queda sin puntos tras filtrar por rango, se ignora silenciosamente (no rompe el gráfico).

## Archivos a tocar

**Creados:**
- `src/components/tendencias/IndicadorCompareChart.tsx`

**Modificados:**
- `src/pages/Tendencias.tsx` — agregar toggle de modo, panel de selección, render del comparador.

## Resultado esperado

En `/tendencias`, usuario hace click en "Comparar indicadores" → ve checkboxes con todos los indicadores disponibles → selecciona "Glucosa" y "Hemoglobina glicosilada" → aparece gráfico grande con dos líneas, eje Y izquierdo en mg/dL para glucosa, eje Y derecho en % para HbA1c, ambas con sus referencias visibles. Puede agregar un tercer indicador (ej. "Triglicéridos") que comparte el eje derecho. El filtro de fechas (3/6/12m) se aplica al gráfico combinado.

