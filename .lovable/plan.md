# Mapa corporal: permitir anotaciones propias + silueta más realista

## Diagnóstico — por qué no puedes agregar observaciones

En `/consultorio`, cuando no llega `?paciente=...` y no tienes pacientes asignados como médico, el código autoselecciona **tu propio `user_id`** y marca `isSelfView = true`. Luego pasa `canEditBodyMap={!isSelfView}` a `PatientExpedienteTabs`, por lo que el `BodyMapEditor` recibe `canEdit=false` y las regiones del SVG se renderizan **sin handlers de click** (`!readOnly && ...` en `BodyMapSVG.tsx`).

Resultado: al tocar el cuerpo no pasa nada porque la capa interactiva ni siquiera se monta en tu propia vista.

## Cambio 1 — Permitir que el paciente anote su propio mapa

En `src/pages/Consultorio.tsx` cambiar:

```tsx
canEditBodyMap={!isSelfView}
```

por:

```tsx
canEditBodyMap={true}
```

El paciente puede registrar hallazgos en su propio cuerpo (síntomas, dolor, lesiones). La RLS ya permite que el `created_by = auth.uid()` inserte sobre su propio `patient_id`, y `RegionDetailDialog` ya distingue `canModerate` (médico/admin) de `isCreator` (autor) para edición/borrado, así que no se rompe la moderación clínica.

## Cambio 2 — Silueta anatómica más realista

Reemplazar la silueta de bloques rectangulares de `src/components/consultorio/BodyMapSVG.tsx` por una silueta humana proporcionada con curvas Bézier, manteniendo la misma API (`view`, `markers`, `onPick`, `onMarkerClick`, `readOnly`) para no tocar nada más.

**Nuevo SVG (frontal y posterior):**

- `viewBox="0 0 220 520"` (proporciones humanas reales ~1:2.4)
- **Capa de fondo**: una sola `<path>` con curvas suaves que dibuja la silueta completa (cabeza ovalada con cuello cónico, hombros redondeados, torso con cintura, caderas, muslos tornados, gemelos, pies). Rellena con `hsl(var(--muted))` y borde `hsl(var(--border))` de 0.6.
- **Capa de detalle anatómico** (no interactiva, decorativa, opacidad 0.25):
  - Frontal: línea de clavículas, línea media esternal, marcado de pectorales, línea umbilical, línea inguinal, rótulas.
  - Posterior: línea de escápulas, columna vertebral, glúteos, fosas poplíteas.
- **Capa interactiva**: 17 regiones (mismas keys: `cabeza`, `cuello`, `torso`, `abdomen`, `pelvis`, `brazo-der/izq`, `antebrazo-der/izq`, `mano-der/izq`, `muslo-der/izq`, `pierna-der/izq`, `pie-der/izq`; y en posterior `espalda-superior`, `espalda-inferior`, `gluteos`). Cada `<path>` sigue el contorno orgánico real del miembro (curvas Bézier), no rectángulos. Hover: `fill="hsl(var(--primary) / 0.25)"` con `stroke` primario.
- **Marcadores**: círculo radio 6 con halo (segundo `<circle>` r=10 con opacidad 0.25 del mismo color de severidad) para que se vean claros sobre la nueva silueta.

Las coordenadas `marker_x`/`marker_y` siguen siendo **porcentuales (0–100)** del viewBox, por lo que los marcadores existentes en BD siguen apareciendo en posiciones equivalentes sin migración.

**Mejoras visuales adicionales:**
- Sombra suave debajo de la silueta (elipse `fill="hsl(var(--muted-foreground) / 0.08)"`).
- Indicador sutil de "lado" (pequeño "D" / "I" en márgenes laterales con `opacity-30`) para orientar al tocar.
- Transición de hover de 150ms.

## Archivos modificados

- `src/pages/Consultorio.tsx` — un solo cambio en la prop `canEditBodyMap`.
- `src/components/consultorio/BodyMapSVG.tsx` — reemplazo completo de los arrays `FRONT_REGIONS` / `BACK_REGIONS` y del JSX del SVG. La API pública del componente no cambia.

## Fuera de alcance

- No se tocan `BodyAnnotationDialog`, `RegionDetailDialog`, `useBodyAnnotations` ni la RLS.
- No se cambia el flujo de `Expediente Digital` (ahí el paciente seguirá entrando vía `/consultorio` para anotar; `ExpedienteDigital.tsx` mantiene `canEdit={false}` en el tab "Mapa corporal" como vista de consulta).
