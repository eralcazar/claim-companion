

## Objetivo

Agregar filtro de rango de fechas (últimos 3/6/12 meses, todo el historial) en la página de Tendencias, filtrando client-side los puntos de cada indicador.

## Cambios

### 1. Actualizar `src/hooks/useTendencias.ts`

Añadir export de helper `filterTendenciasByRango(indicadores, rango)`:

- `rango` valores: `'3m' | '6m' | '12m' | 'todo'`.
- Calcula fecha límite con `Date.now()` menos meses correspondientes.
- Para cada `TendenciaIndicador`, filtra `puntos` donde `punto.fecha >= fecha_limite_iso`.
- Si `rango === 'todo'`, devuelve indicadores sin filtrar puntos (pero filtra indicadores sin puntos restantes).
- Devuelve array `TendenciaIndicador[]` con `puntos` filtrados (mantiene estructura para que `IndicadorTrendChart` funcione igual).

### 2. Actualizar `src/pages/Tendencias.tsx`

- Importar `filterTendenciasByRango`.
- Añadir state `rangoFechas` con default `'todo'`.
- Añadir Select de rango de fechas en la barra de filtros (al lado del buscador o paciente):
  - Opciones: `todo` → "Todo el historial", `3m` → "Últimos 3 meses", `6m` → "Últimos 6 meses", `12m` → "Últimos 12 meses".
- Filtrado pipeline actualizado:
  1. `useTendenciasPaciente(targetId)` trae todos los datos.
  2. `filteredByRango = useMemo(() => filterTendenciasByRango(indicadores, rangoFechas), [indicadores, rangoFechas])`.
  3. `filteredBySearch = filteredByRango.filter(i => i.nombre.toLowerCase().includes(q.toLowerCase()))`.
- Ajustar layout responsive para que el buscador, el selector de paciente y el rango de fechas quepan en una línea (o flex-wrap).
- Actualizar mensaje vacío: si `indicadores.length > 0` pero `filteredByRango.length === 0`, mostrar "No hay datos en el periodo seleccionado. Prueba con un rango mayor."

### 3. Detalles UX

- El filtro de rango aplica incluso si no hay búsqueda por nombre.
- Orden de puntos dentro de cada indicador se mantiene cronológico.
- El badge de "n puntos" o sparkline no se ven afectados visualmente; solo los gráficos grandes muestran datos acotados.
- Reset de rango al cambiar de paciente (opcional: mantener preferencia del usuario).

## Archivos a tocar

**Modificados:**
- `src/hooks/useTendencias.ts` — añadir export `filterTendenciasByRango`.
- `src/pages/Tendencias.tsx` — añadir Select de rango, integrar filtro en pipeline de datos.

## Resultado esperado

En `/tendencias`, usuario selecciona "Últimos 6 meses" → cada gráfico muestra solo los puntos de ese periodo, manteniendo ejes y referencias. Al pasar a "Todo el historial", se ven todos los datos nuevamente. El filtro es instantáneo (client-side) sin recargar datos del backend.

