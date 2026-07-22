## Fase 3 — Recorridos GPS avanzados + etiquetado automático de mediciones

Cinco entregables sobre el módulo GPS ya existente (`/recorridos`, `useLocationPreference`, `attachLocationIfEnabled`, tablas `workout_routes` / `workout_route_points`, columnas `latitude`/`longitude`/`location_accuracy_m`/`location_captured_at` en tablas clínicas).

### 1. Reproducción animada de recorridos (play/pause)
- Nuevo componente `src/components/map/RoutePlayer.tsx`: recibe los `points` con `captured_at`, `speed_mps` y muestra:
  - Mapa base + polilínea completa gris + polilínea "recorrida" resaltada.
  - Marcador que avanza en el tiempo real del recorrido (interpolando por timestamp).
  - Controles: Play, Pause, Reset, slider de progreso, selector de velocidad (1x, 2x, 4x, 10x).
  - Panel HUD con tiempo transcurrido, distancia acumulada, ritmo instantáneo, velocidad km/h.
- Integración en `Recorridos.tsx`: al abrir un recorrido guardado, además del `RouteMap` estático se muestra el `RoutePlayer` en una pestaña "Reproducir".

### 2. Modo de seguimiento GPS con ahorro de batería + alertas de permisos
- Extender `useLocationPreference` para persistir un nuevo campo `location_tracking_mode` en `profiles` (valores: `balanced` | `high_accuracy` | `battery_saver`).
- Actualizar `useLiveTracking` para leer ese modo y ajustar `enableHighAccuracy`, `maximumAge` y frecuencia (por ejemplo, `battery_saver` = 15 s / lowAccuracy; `high_accuracy` = 1 s / highAccuracy; `balanced` = 5 s).
- Nuevo helper `src/lib/geo/permissions.ts` que consulte `navigator.permissions.query({name:'geolocation'})` y, en Capacitor, `Geolocation.checkPermissions()`. Devuelve `granted | denied | prompt | unavailable`.
- Añadir en `Recorridos.tsx` y `LocationSettingsCard.tsx` un banner de alerta cuando el permiso esté `denied` o `prompt`, con instrucciones específicas iOS/Android/desktop.
- Soporte foreground/background: cuando corra sobre Capacitor, usar `@capacitor/geolocation` con `watchPosition`; en web mantener `navigator.geolocation.watchPosition`. Documentar que el "background real" requiere plugin nativo y añadir aviso "En web sólo se registra en primer plano".

### 3. Clustering y rendimiento en el mapa de recorridos
- Instalar `leaflet.markercluster` y `react-leaflet-cluster` (o equivalente ya compatible con la versión de leaflet en uso).
- Nuevo componente `src/components/map/RoutesOverviewMap.tsx`: muestra en un solo mapa TODOS los recorridos del usuario:
  - Cada recorrido = un marcador en su punto de inicio, agrupados por cluster.
  - Al hacer click en un marcador se resalta la polilínea y muestra popup con métricas.
  - Zoom-in expande clusters; a nivel alto de zoom se dibuja la polilínea completa; a niveles bajos sólo el marcador (para performance con muchos registros).
- Optimización de `RouteMap` existente: aplicar Douglas-Peucker (simplificación) a rutas con > 500 puntos antes de renderizar la polilínea.
- Nueva sección en `Recorridos.tsx`: pestaña "Mapa general" que renderiza `RoutesOverviewMap`.

### 4. Exportación GPX de recorridos
- Nuevo helper `src/lib/geo/gpx.ts` con función `buildGpx(route, points): string` que genera un XML GPX 1.1 válido (`<trk><trkseg><trkpt lat lon><ele><time>`).
- Nuevo componente `src/components/map/RouteExportButtons.tsx` con:
  - Botón "Descargar GPX" por recorrido individual.
  - Botón "Exportar rango" en la lista: date-range picker → junta varios recorridos en un `.zip` (o múltiples archivos) usando `jszip`.
- Integrado en `Recorridos.tsx` junto a cada tarjeta de recorrido y en el header de la lista.

### 5. Etiquetado automático de ubicación en formularios manuales
Aplicar `attachLocationIfEnabled` en los formularios manuales que hoy no lo usan:
- `src/components/temperature/TemperatureForm.tsx`
- `src/components/glucose/GlucoseForm.tsx`
- `src/components/oxygen-saturation/SpO2Form.tsx`
- Cualquier form manual de BP y HR que inserte en `blood_pressure_readings` / `heart_rate_readings` (localizar con un `rg` de `insert` antes de editar).

En cada uno:
- Antes de `supabase.from(...).insert(payload)`, envolver `payload` con `await attachLocationIfEnabled(payload)`.
- Asegurar que el `location_captured_at` corresponde al momento del guardado (ya se llena en el helper con `p.captured_at`).
- Añadir un pequeño `<LocationBadge>` bajo el botón "Guardar" cuando `tagging` esté activo, indicando "Se guardará tu ubicación aproximada".

### Detalles técnicos
- Nuevas dependencias: `leaflet.markercluster`, `@types/leaflet.markercluster`, `react-leaflet-cluster`, `jszip`.
- Migración menor: agregar columna `location_tracking_mode text default 'balanced'` en `profiles`, con check de valores permitidos. Sin cambios en RLS existentes.
- Sin cambios en las políticas actuales de `workout_routes` / `workout_route_points`.
- Fix colateral: revisar el error de build reportado (dynamic import no resuelto) y corregirlo antes de terminar; probablemente ligado a un import faltante introducido en la fase 2.

### Fuera de alcance
- Background tracking nativo real (requiere plugin `@capacitor-community/background-geolocation`): se deja como fase 4.
- Compartir GPX directo por WhatsApp desde nativo: por ahora sólo descarga de archivo.
