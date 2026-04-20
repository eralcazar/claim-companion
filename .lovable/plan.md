

El usuario quiere importación masiva por CSV en los tabs **Campos** y **Secciones** del `FormatManager`.

## Plan

### 1. Botón "Importar CSV" en cada tab

**Tab Secciones** (`SectionsList.tsx`):
- Botón **"Importar CSV"** junto a "Agregar" en la toolbar.
- Botón **"Plantilla CSV"** que descarga template vacío con headers correctos.

**Tab Campos** (`FieldsTable.tsx`):
- Botón **"Importar CSV"** en la toolbar superior.
- Botón **"Plantilla CSV"** para descargar template.

### 2. Diálogo de importación (compartido)

Nuevo componente `src/components/admin/CSVImportDialog.tsx`:
- Input file (acepta `.csv`).
- Parser con **PapaParse** (`papaparse` ya soporta headers, comillas, encoding).
- Preview de las primeras 10 filas en tabla.
- Validación: muestra errores por fila (campos requeridos faltantes, tipos inválidos, secciones inexistentes).
- Resumen: "X filas válidas · Y con errores · Z se omitirán".
- Botón **"Importar N filas"** confirma; las inválidas se omiten.

### 3. Esquemas CSV

**Secciones** (`secciones.csv`):
```
nombre,orden,pagina
Datos del paciente,0,1
Datos médicos,1,1
```
- `nombre` requerido. `orden` y `pagina` enteros (default 0/1).
- Match por `nombre` para upsert (si existe, actualiza orden/pagina).

**Campos** (`campos.csv`):
```
clave,etiqueta,tipo,seccion_nombre,pagina,requerido,longitud_max,opciones,mapeo_perfil,mapeo_poliza,mapeo_siniestro,mapeo_medico,campo_x,campo_y,campo_ancho,campo_alto
nombre,Nombre completo,texto,Datos del paciente,1,true,100,,full_name,,,,10.5,12.3,40,4
sexo,Sexo,seleccion,Datos del paciente,1,true,,M;F,sex,,,,55,12.3,20,4
```
- `clave`, `etiqueta`, `tipo` requeridos.
- `seccion_nombre` se resuelve a `seccion_id` con la lista actual; si no existe, se crea automáticamente.
- `opciones` separadas por `;` (se guardan como JSON array).
- `requerido` acepta `true/false/sí/no/1/0`.
- Coordenadas opcionales (números entre 0–100).

### 4. Lógica de importación

Hooks nuevos en `useFormatos.ts`:
- `useImportSecciones(formularioId)` — bulk upsert con match por nombre.
- `useImportCampos(formularioId)` — resuelve `seccion_id` por nombre, crea secciones faltantes, hace bulk insert.

Toast final: "Importadas N secciones / N campos" o "X errores, ver consola".

### 5. Archivos a tocar

- `src/components/admin/CSVImportDialog.tsx` (nuevo) — diálogo reutilizable.
- `src/components/admin/SectionsList.tsx` — botones Importar/Plantilla.
- `src/components/admin/FieldsTable.tsx` — botones Importar/Plantilla.
- `src/hooks/useFormatos.ts` — `useImportSecciones`, `useImportCampos`.
- Dependencia: `papaparse` + `@types/papaparse`.

Sin migraciones de BD.

