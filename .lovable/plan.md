

## Acceso directo al historial moderado por zona en modo exploración libre

Hoy en `/consultorio` (sin appointmentId), el médico ve el `BodyMapEditor` con el historial completo del paciente y puede abrir "Ver zona" por cada `body_part` que ya tiene anotaciones. Falta un atajo para abrir directamente el historial moderado de **cualquier zona**, incluso las que aún no tienen marcadores, sin tener que clickear primero en el SVG.

### Cambios

**1. `src/components/consultorio/BodyMapEditor.tsx`**
- Nueva prop opcional `showQuickRegionAccess?: boolean` (default `false`).
- Cuando está activa, debajo del SVG y antes de la lista agrupada, agregar un bloque **"Ir al historial de una zona"**:
  - `Select` con todas las zonas de `BODY_PARTS_LABEL` (ordenadas alfabéticamente).
  - Indicador a la derecha de cada opción con la cantidad de anotaciones existentes en esa zona (badge pequeño) — `0` si no hay.
  - Al elegir una zona, abre directamente `RegionDetailDialog` con esa `body_part` y la `body_view` actual del tab activo.
- Reusa el state `regionPart` que ya existe; no requiere lógica nueva de moderación (ya está en `RegionDetailDialog`).

**2. `src/pages/Consultorio.tsx`**
- En el modo "exploración libre" (sin `appointmentId`), pasar `showQuickRegionAccess={true}` al `BodyMapEditor`.
- En el modo "consulta en curso" (con `appointmentId`), no se pasa la prop → comportamiento idéntico al actual.

### Lo que NO cambia
- Esquema DB y RLS: sin cambios.
- `RegionDetailDialog`: sin cambios — ya muestra historial completo + moderación.
- Flujo dentro de cita ni vista del paciente.
- No se agregan rutas nuevas.

### Detalle técnico

```text
[Tabs Frontal/Posterior]
[SVG cuerpo]
─────────────────────────────
Ir al historial de una zona
[Select: Cabeza (3) ▾]   ← NUEVO, solo en modo exploración libre
─────────────────────────────
N anotación(es) en vista frontal
[Lista agrupada por body_part con "Ver zona"]
```

El conteo por zona se calcula a partir de `annotations` (ya cargadas por `useBodyAnnotations({ patientId })`), agrupando por `body_part` ignorando la vista actual para mostrar el total histórico real por zona.

