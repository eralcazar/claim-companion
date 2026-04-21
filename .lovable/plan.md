

## Objetivo

Agregar un mini-gráfico (sparkline) en cada fila de indicador dentro de `ResultadosManager` para ver la evolución histórica del indicador sin salir del estudio.

## Cambios

### 1. Nuevo hook: `useIndicadorHistory`

Archivo: `src/hooks/useTendencias.ts` (agregar export).

- `useIndicadorHistory(patientId: string, nombreIndicador: string)` — query React Query.
- Trae todos los `indicadores_estudio` del paciente con el mismo `nombre_indicador` (case-insensitive con `ilike`).
- Hace JOIN con `resultados_estudios` para obtener `fecha_resultado` (o `created_at` como fallback).
- Devuelve array ordenado cronológicamente: `[{ fecha, valor, es_normal, min, max }]`.
- `enabled: !!patientId && !!nombreIndicador && valor != null`.
- `staleTime: 60_000` para no refetchear constantemente.

### 2. Nuevo componente: `IndicadorSparkline`

Archivo: `src/components/tendencias/IndicadorSparkline.tsx`.

- Props: `patientId`, `nombreIndicador`, `valorActual`.
- Usa `useIndicadorHistory`.
- Renderiza un mini `LineChart` de recharts:
  - Tamaño: ~120×32 px (compacto, en línea con el texto).
  - Sin ejes, sin grid, sin tooltip pesado — solo la línea.
  - Color según tendencia: verde si último ≤ penúltimo (estable/baja), naranja si sube, rojo si último valor está fuera de rango.
  - Puntos pequeños; el último punto resaltado.
  - Tooltip simple en hover mostrando fecha + valor.
- Si solo hay 1 medición (la actual): renderiza un guión `—` con texto "1ª medición".
- Si está cargando: skeleton de la misma altura.
- Indicador de delta opcional al lado: `↗ +12%` / `↘ -5%` comparando con la medición anterior.

### 3. Integración en `ResultadosManager.tsx`

- En el `map` de indicadores dentro de `ResultadoItem`, agregar `<IndicadorSparkline>` después del nombre+valor+rango y antes del badge "Fuera de rango / Normal".
- Solo se muestra si `i.valor != null` (los cualitativos no tienen sparkline).
- Layout: ajustar la fila a flex-wrap para que el sparkline quepa cómodamente en mobile (debajo) y en línea en desktop.

## Archivos a tocar

**Creados:**
- `src/components/tendencias/IndicadorSparkline.tsx`

**Modificados:**
- `src/hooks/useTendencias.ts` — agregar `useIndicadorHistory`.
- `src/components/estudios/ResultadosManager.tsx` — render del sparkline en cada fila de indicador.

## Resultado esperado

Al expandir "Ver indicadores" de un resultado, cada fila numérica muestra un mini-gráfico de ~120px con la línea histórica de ese indicador para el paciente. Verde si está estable/normal, rojo si el último valor está fuera de rango, con un pequeño delta `↗/↘ %` vs la medición previa. Los indicadores cualitativos (sin valor numérico) no muestran sparkline.

