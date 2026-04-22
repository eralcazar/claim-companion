

## Objetivo

Dos funcionalidades nuevas para el manejo de resultados de estudios médicos:

1. **Exportar tendencias**: botón en `/tendencias` para descargar un CSV con los indicadores filtrados (rango de fechas + búsqueda + selección en modo comparar) y opción de compartir vía Web Share API en móvil.
2. **Carga masiva de indicadores**: botón en `ResultadosManager` para descargar un layout CSV plantilla y subir múltiples indicadores de un resultado de una sola vez.

Usamos **CSV** (no .xlsx) para mantener la app liviana, sin dependencias nuevas, y porque ya existe `CSVImportDialog` reutilizable con `Papaparse`.

## Cambios

### Parte 1 — Exportar tendencias

#### 1.1 Helper: `src/lib/exportTendenciasCSV.ts`

- Función `exportTendenciasToCSV(indicadores, opciones)`:
  - Inputs: `TendenciaIndicador[]` filtrado, `{ pacienteNombre, rangoLabel, modo }`.
  - Genera dos secciones en un mismo CSV (separadas por línea en blanco):
    - **Cabecera meta**: 3 filas con paciente, rango y fecha de generación.
    - **Resumen**: una fila por indicador → Nombre, Unidad, Ref. mín, Ref. máx, # mediciones, Primera fecha, Última fecha, Último valor, Estado (Normal/Fuera de rango/N/A).
    - **Detalle**: una fila por punto → Indicador, Fecha, Valor, Unidad, Ref. mín, Ref. máx, ¿Normal?, Tipo de estudio.
  - Escapa comillas y comas correctamente. Devuelve `{ blob, filename }` con nombre `tendencias_{paciente}_{YYYYMMDD}.csv`.

#### 1.2 Componente: `src/components/tendencias/ExportTendenciasButton.tsx`

- Props: `indicadores`, `pacienteNombre`, `rangoLabel`, `modo`.
- Botón principal con ícono `Download` + texto "Exportar". En mobile (`<sm`) sólo el ícono.
- `DropdownMenu` con dos acciones:
  - **Descargar CSV** → genera blob y descarga vía `<a download>`.
  - **Compartir** → si `navigator.canShare({ files: [file] })`, usa `navigator.share`; si no, fallback a descarga + toast.
- Deshabilitado si `indicadores.length === 0`.

#### 1.3 Integrar en `Tendencias.tsx`

- Importar `ExportTendenciasButton`.
- Calcular `pacienteNombre` (lookup en `patients` o `user.user_metadata.full_name`).
- Calcular `rangoLabel` legible desde `rangoFechas`.
- Determinar dataset según modo: `filtered` (individual) o `indicadoresComparar` (comparar).
- Colocar el botón en la barra de filtros con `ml-auto` para alineación a la derecha.

### Parte 2 — Carga masiva de indicadores

#### 2.1 Componente: `src/components/estudios/IndicadoresBulkImportDialog.tsx`

- Reutiliza `CSVImportDialog` ya existente.
- Plantilla con columnas: `nombre_indicador, valor, unidad, valor_referencia_min, valor_referencia_max`.
- Fila de ejemplo: `Glucosa,95,mg/dL,70,100`.
- Filename: `layout_indicadores.csv`.
- `parseRow`:
  - `nombre_indicador` obligatorio (no vacío).
  - `valor`, `min`, `max` opcionales pero deben ser numéricos si vienen.
  - Valida `min <= max` cuando ambos existen.
  - Calcula `es_normal` y `flagged` igual que `IndicadorEditRow`.
- `onImport` recibe array, hace `bulkInsert` vía nuevo hook `useBulkInsertIndicadores` (un solo `.insert([...])` a `indicadores_estudio`).
- Toast de éxito con conteo.

#### 2.2 Hook nuevo en `useResultadosEstudio.ts`

```ts
export function useBulkInsertIndicadores() { ... }
```
- Recibe `{ resultado_id, patient_id, rows: [...] }`.
- Mapea cada `row` agregando `resultado_id` y `patient_id`.
- Inserta en bloque con `supabase.from("indicadores_estudio").insert(rows)`.
- Invalida `["indicadores", resultado_id]` al éxito.

#### 2.3 Integrar en `ResultadoItem` (ResultadosManager.tsx)

- Añadir estado `bulkOpen: boolean`.
- Junto a "Extraer con IA" agregar botón **"Importar CSV"** (ícono `FileUp`).
- Al abrir, monta `<IndicadoresBulkImportDialog resultadoId={...} patientId={...} open={bulkOpen} onOpenChange={setBulkOpen} />`.
- Sólo visible si `canManage`.

### Detalles UX

- Layout CSV usa los **mismos nombres de columna** que la base, así un usuario técnico puede editarlo en Excel/Google Sheets sin confusión.
- Mensaje en el diálogo: "Las filas con errores se omitirán. Los campos numéricos usan punto como separador decimal."
- Botón de exportar tendencias y dropdown de compartir consistentes con el resto de UI (variant outline, size sm).
- En móvil, el botón Importar CSV se acomoda en el `flex-wrap` existente de la barra de acciones del resultado.
- El export y el bulk import son 100% client-side (excepto el insert final a Supabase).

## Archivos

**Creados:**
- `src/lib/exportTendenciasCSV.ts`
- `src/components/tendencias/ExportTendenciasButton.tsx`
- `src/components/estudios/IndicadoresBulkImportDialog.tsx`

**Modificados:**
- `src/pages/Tendencias.tsx` — agregar botón Exportar a la barra de filtros.
- `src/components/estudios/ResultadosManager.tsx` — agregar botón "Importar CSV" en `ResultadoItem`.
- `src/hooks/useResultadosEstudio.ts` — nuevo `useBulkInsertIndicadores`.

## Resultado esperado

**Tendencias**: usuario filtra por "Últimos 6 meses" + busca "glucosa" → click en "Exportar" → opciones "Descargar CSV" o "Compartir" → recibe `tendencias_juan_perez_20260422.csv` con resumen y detalle. En modo comparar, sólo se exportan los 2-3 indicadores seleccionados.

**Carga masiva**: médico abre un resultado → click "Importar CSV" → descarga `layout_indicadores.csv` → completa filas en Excel → sube → ve preview con válidas/erróneas → confirma → todos los indicadores aparecen en la lista del resultado y alimentan automáticamente la página de tendencias.

