## Fase 3 — Módulo Nutrición + rol Nutricionista (frontend)

La base de datos ya quedó lista (rol `nutricionista` agregado al enum, tablas `nutrition_metrics` y `nutrition_food_traffic` con RLS y triggers de validación). Falta el frontend.

### 1. Catálogo de features y roles (`src/lib/features.ts`)
- Agregar `FeatureKey`: `nutricion` (paciente) y `nutricion_panel` (nutricionista).
- Nuevo grupo `nutricionista`.
- Agregar `'nutricionista'` a `ALL_ROLES` para que aparezca en `AccessManager` y `UserRolesRow`.
- Icono `Apple` de lucide.

### 2. Permisos por defecto (seed via insert tool en `role_permissions`)
- `nutricion`: visible para `paciente`, `medico`, `enfermero`, `nutricionista`, `admin`.
- `nutricion_panel`: visible para `nutricionista`, `admin`.

### 3. Hook `src/hooks/useNutrition.ts`
- `useNutritionMetrics(patientId)` — lista ordenada por `recorded_at desc`.
- `useCreateNutritionMetric`, `useUpdateNutritionMetric`, `useDeleteNutritionMetric`.
- `useFoodTraffic(patientId?)` — devuelve globales + del paciente (si se pasa).
- `useCreateFoodTraffic`, `useUpdateFoodTraffic`, `useDeleteFoodTraffic`.
- Helper `classifyIMC(imc)` con badges (Bajo peso / Normal / Sobrepeso / Obesidad I/II/III).

### 4. Página `/nutricion` (`src/pages/Nutricion.tsx`)
Dos tabs:

**Tab "Métricas"**
- Selector de paciente si el usuario es personal con varios (reutiliza patrón de `PresionArterial.tsx`).
- Botón **Nueva medición** → dialog con form (fecha, peso, peso seco, talla, % grasa, % agua, masa muscular, cintura, cadera, notas). IMC se autocalcula en el trigger.
- Tarjetas resumen: último peso, último IMC con categoría, # mediciones del mes.
- Gráfico recharts (líneas): peso e IMC en el tiempo.
- Tabla editable con acciones (editar/borrar solo creador o admin).
- Botón **Exportar CSV**.

**Tab "Semáforo de alimentos"**
- Grid visual de tarjetas coloreadas por grupo, agrupadas por color (verde / amarillo / rojo).
- Filtro por grupo y por paciente (global vs personalizado).
- Para nutricionistas y admin: CRUD (agregar / editar / borrar) con dialog. Permite marcar como global (`patient_id = NULL`) o vinculado al paciente activo.
- Para pacientes y demás roles: solo lectura.

### 5. Navegación
- `src/components/AppSidebar.tsx`: agregar item "Nutrición" (`Apple`, ruta `/nutricion`, feature `nutricion`) en `mainItems`. Agregar grupo `nutricionista` con "Panel Nutrición" (feature `nutricion_panel`) — mismo patrón que `nurseItems`.
- `src/App.tsx`: nueva ruta `/nutricion` dentro de `ProtectedRoute`.
- `src/pages/PatientView.tsx`: nueva pestaña "Nutrición" (opcional, mismo componente en modo embebido).

### Archivos a tocar/crear

- **Nuevo**: `src/hooks/useNutrition.ts`
- **Nuevo**: `src/pages/Nutricion.tsx`
- **Modificar**: `src/lib/features.ts`, `src/components/AppSidebar.tsx`, `src/App.tsx`
- **Datos**: insertar filas en `role_permissions` para `nutricion` y `nutricion_panel`

### Lo que NO cambia

- No se tocan agenda, recetas, planes, ni OCR.
- `usePermissions` ya consume `role_permissions` dinámicamente — basta con seed.
- No se requiere nueva migración de DB.
