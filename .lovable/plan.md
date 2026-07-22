## Objetivo

Integrar GPS del dispositivo (web + móvil vía Capacitor) usando **Leaflet + OpenStreetMap** (gratis, sin API key) para:

1. **Etiquetar con ubicación** cualquier medición clínica (manual o BLE): temperatura, glucosa, SpO₂, presión, frecuencia cardiaca, pulso.
2. **Registrar pasos y recorridos GPS** durante entrenamientos al aire libre, con mapa en vivo de la ruta.
3. **Visualizar en mapas** el histórico de pasos/movimientos y mediciones geolocalizadas.

## Alcance funcional

### A. Ubicación en mediciones (todas las métricas)
- Al guardar una lectura (manual o BLE), capturar opcionalmente `lat/lng/accuracy/timestamp` del GPS.
- Toggle por usuario en Ajustes: "Adjuntar ubicación a mis mediciones" (default **OFF**, consentimiento explícito por privacidad LFPDPPP/NOM-024).
- Mostrar badge de ubicación en historial con popover de mini-mapa (Leaflet) y opción de borrar la ubicación de una lectura.

### B. Recorridos GPS en Ejercicios / Pasos
- Nuevo tipo de sesión "Actividad al aire libre" (correr, caminar, ciclismo).
- Botón **"Iniciar recorrido"** en `/pasos` y `/ejercicios` que arranca tracking GPS (`watchPosition`).
- Captura en vivo: puntos (lat, lng, alt, speed, ts), distancia (Haversine), ritmo, elevación acumulada, duración, pasos estimados (o Health Connect/HealthKit si disponible).
- **Mapa en vivo** con Leaflet + tiles OSM mostrando la polyline creciendo.
- Al finalizar: guardar recorrido, mostrar mapa estático con la ruta y stats. Export GPX opcional.

### C. Vistas de mapa (nuevas)
- **Mapa de mis mediciones**: marcadores agrupados (cluster) por métrica sobre OSM, filtrable por tipo/rango.
- **Mapa de recorridos**: lista + mini-mapas de las últimas rutas.
- **Heatmap opcional** de pasos por ubicación (fase 3).

## Cambios técnicos

### Base de datos (migración)
- Columnas opcionales `latitude numeric`, `longitude numeric`, `location_accuracy_m numeric`, `location_captured_at timestamptz` en: `blood_pressure_readings`, `heart_rate_readings`, `spo2_readings`, `temperature_readings`, `glucose_readings`, `activity_readings`.
- Nueva tabla `workout_routes`:
  - Columnas: `id`, `user_id`, `workout_session_id` (FK opcional), `activity_type` (walking/running/cycling), `started_at`, `ended_at`, `distance_m`, `duration_s`, `avg_pace_s_per_km`, `elevation_gain_m`, `steps_estimated`, `notes`.
  - GRANTs (authenticated CRUD, service_role ALL) + RLS owner-only.
- Nueva tabla `workout_route_points`:
  - `id`, `route_id` (FK cascade), `sequence int`, `captured_at`, `latitude`, `longitude`, `altitude_m`, `speed_mps`, `accuracy_m`, `heading_deg`.
  - Índice (`route_id`, `sequence`). RLS via ownership de la ruta.
- Nueva columna `profiles.location_tagging_enabled boolean default false` y `location_tracking_enabled boolean default false`.

### Frontend
- **Dependencias**: `leaflet`, `react-leaflet`, `@types/leaflet`. (Todo gratis, tiles de `tile.openstreetmap.org` con atribución obligatoria "© OpenStreetMap contributors").
- `src/lib/geo/location.ts`: wrapper unificado Capacitor Geolocation (nativo) / `navigator.geolocation` (web) con timeout y fallback silencioso.
- `src/lib/geo/haversine.ts`: cálculo de distancia y ritmo.
- `src/hooks/useLocationPreference.ts`: lee/guarda toggles del usuario.
- `src/hooks/useLiveTracking.ts`: gestiona `watchPosition`, buffer, distancia acumulada, pace, elevación, pausar/reanudar.
- `src/components/map/RouteMap.tsx`: Leaflet + OSM tiles + polyline (histórico).
- `src/components/map/LiveRouteMap.tsx`: mapa en vivo con recentrado automático.
- `src/components/map/LocationBadge.tsx`: badge + popover mini-mapa para lecturas geolocalizadas.
- `src/components/map/MeasurementsMap.tsx`: mapa con marcadores agrupados de todas las mediciones.
- Modificar formularios: `SpO2Form`, `TemperatureForm`, `GlucoseForm`, `BloodPressureForm`, `HeartRateForm` → llamar `getCurrentPosition()` si el toggle está activo.
- Modificar hooks BLE para inyectar ubicación al momento de la lectura.
- Nueva página `src/pages/Recorridos.tsx`: iniciar/pausar/finalizar recorrido con mapa en vivo + historial.
- Actualizar `StepsMonitor.tsx`: agregar botón "Iniciar recorrido" y sección "Mis rutas recientes".
- Actualizar listas (`SpO2List`, `TemperatureList`, `BitacoraTab`) con badge de ubicación.

### Ajustes de privacidad
Sección "Ubicación y GPS" en `/profile`:
- Toggle "Etiquetar mediciones con ubicación".
- Toggle "Permitir recorridos GPS".
- Botón "Borrar todas las ubicaciones guardadas" (bulk `UPDATE ... SET latitude=NULL`).
- Texto legal breve sobre uso y retención.

### Nativo (Capacitor)
- Instalar `@capacitor/geolocation`.
- Permisos iOS: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription` (para tracking en background).
- Permisos Android: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`.
- Instruir al usuario correr `git pull && npx cap sync` al terminar.

## Detalle técnico — OpenStreetMap + Leaflet

```tsx
// tiles gratuitos, sin API key
<MapContainer center={[lat, lng]} zoom={15}>
  <TileLayer
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
  <Polyline positions={points} color="hsl(var(--primary))" />
</MapContainer>
```

- Cumplir con la [Tile Usage Policy de OSM](https://operations.osmfoundation.org/policies/tiles/): atribución visible, sin uso masivo. Para producción a escala se puede cambiar a proveedor de tiles (MapTiler/Stadia) sin tocar el resto del código.

## Entregables por fases

**Fase 1 — Etiquetado de ubicación en mediciones** (rápido)
- Migración de columnas geo en las 6 tablas.
- Toggle en Ajustes + `useLocationPreference`.
- Wrapper `getCurrentPosition` + integración en los 5 formularios manuales.
- Badge de ubicación con mini-mapa en listas.

**Fase 2 — Recorridos GPS con mapa en vivo**
- Tablas `workout_routes` + `workout_route_points`.
- `useLiveTracking` + página `Recorridos` con Leaflet en vivo.
- Historial con `RouteMap` y stats.
- Botón "Iniciar recorrido" en `StepsMonitor`.

**Fase 3 — Mapa consolidado + nativo**
- `MeasurementsMap` con clustering.
- Inyección de ubicación en lecturas BLE.
- `@capacitor/geolocation` + permisos iOS/Android + export GPX.

## Notas
- Este plan mantiene privacidad-por-defecto: nada de ubicación se captura ni almacena hasta que el usuario active el toggle explícitamente.
- Uso de tiles OSM sin API key → cero costo. Atribución obligatoria incluida en cada mapa.
