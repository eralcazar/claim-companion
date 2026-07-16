# Integración de Smartwatch — Opción A (Capacitor + HealthKit / Health Connect)

Convertimos CareCentral en app híbrida con Capacitor y sincronizamos automáticamente las mediciones del smartwatch del paciente (Apple Watch vía HealthKit en iOS, y Galaxy Watch / Fitbit / Garmin / Wear OS / Xiaomi vía Health Connect en Android) a las tablas clínicas ya existentes.

## Alcance funcional

1. Nueva sección **"Dispositivos de salud"** dentro de `/perfil`:
   - Botón **Conectar Apple Salud** (iOS) o **Conectar Health Connect** (Android).
   - Estado de conexión, última sincronización, y toggle por tipo de dato.
   - Botón **Sincronizar ahora** + sincronización automática al abrir la app.
2. Métricas sincronizadas y su tabla destino:
   - Frecuencia cardíaca → nueva tabla `heart_rate_readings`.
   - SpO₂ → `spo2_readings` (ya existe).
   - Presión arterial → `blood_pressure_readings` (ya existe).
   - Glucosa (si el reloj/CGM la reporta) → `glucose_readings` (ya existe).
   - Temperatura corporal → `temperature_readings` (ya existe).
   - Pasos + minutos activos + sueño → nueva tabla `activity_readings`.
3. Cada registro sincronizado guarda `source` (`apple_health` / `health_connect`), `device_name`, `external_uuid` (para dedupe) y `synced_at`.
4. Badge visual **"Desde Apple Watch"** / **"Desde Health Connect"** en las gráficas y listas existentes.
5. Indicador **"Auto-sincronizado"** en el Dashboard.

## Backend (Lovable Cloud)

Migración única con:

- Tabla `heart_rate_readings` (patient_id, bpm, medido_en, contexto, source, device_name, external_uuid, notes) — RLS por paciente/personal/broker/admin + GRANTs.
- Tabla `activity_readings` (patient_id, fecha, pasos, minutos_activos, calorias, minutos_sueno, source, device_name, external_uuid) — mismas policies.
- Columnas `source TEXT`, `device_name TEXT`, `external_uuid TEXT UNIQUE` añadidas a `spo2_readings`, `blood_pressure_readings`, `glucose_readings`, `temperature_readings` para permitir dedupe al re-sincronizar.
- Feature key `health_devices` en `role_permissions` y `plan_role_features` (paciente/medico/enfermero/admin).

## Capacitor setup

1. Instalar `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`.
2. `capacitor.config.ts` con `appId: app.lovable.760a7d02203c4cb8b41067b077be5e0e`, `appName: CareCentral`, y `server.url` apuntando a la preview de Lovable para hot-reload.
3. Plugins de salud:
   - iOS: `@perfood/capacitor-healthkit` (HealthKit).
   - Android: `@ubie-oss/capacitor-health-connect` (Health Connect).
4. Un wrapper único `src/lib/health/index.ts` que detecta plataforma (`Capacitor.getPlatform()`) y expone una API común: `requestPermissions()`, `readSince(type, from)`, `isAvailable()`.

## Frontend

- Nuevo hook `useHealthDevices()` — estado de conexión, permisos, última sync, mutaciones para sincronizar.
- Nuevo componente `HealthDevicesPanel.tsx` dentro de `/perfil`.
- Función `syncHealthData(patientId)` que:
  1. Lee del plugin nativo desde la última `synced_at`.
  2. Convierte a filas de cada tabla.
  3. Hace `upsert` con `onConflict: external_uuid` para evitar duplicados.
  4. Actualiza `synced_at` en un pequeño registro `profiles.health_last_synced_at` (columna nueva).
- Badge `<HealthSourceBadge source={row.source} />` reutilizable en las listas ya existentes (SpO2List, GlucoseList, TemperatureList, BloodPressureModule).
- Auto-sync en `AppLayout` al montar cuando la conexión está activa (throttled a 1 vez cada 15 min).

## Instrucciones para el usuario (build nativo)

Como el navegador no puede leer HealthKit / Health Connect, la sincronización solo funciona en la app compilada. El usuario debe:

1. Export to GitHub → `git pull` → `npm install`.
2. `npx cap add ios` y/o `npx cap add android`.
3. `npm run build && npx cap sync`.
4. `npx cap run ios` (requiere Xcode/Mac) o `npx cap run android` (requiere Android Studio).
5. Publicar en App Store / Google Play cuando esté listo.

En la web (Lovable preview y publish), el panel muestra un mensaje: **"Disponible en la app móvil de CareCentral"**.

## Fuera de alcance (para fases siguientes)

- Fitbit / Garmin / Withings vía **APIs cloud OAuth** (útiles si el usuario no quiere instalar la app o usa iOS con reloj no-Apple). Se puede añadir después sin tocar lo anterior.
- Escritura hacia HealthKit / Health Connect (por ahora solo lectura).
- Alertas automáticas basadas en umbrales (HR elevada, SpO₂ baja) — se puede reutilizar la tabla `medical_alerts` existente en una segunda iteración.

## Riesgos y notas

- Publicar en App Store requiere cuenta Apple Developer ($99 USD/año) y aprobar el uso de HealthKit.
- Health Connect solo funciona en Android 14+ (o Android 8+ con la app Health Connect instalada de Play Store).
- El servidor `server.url` de Capacitor apuntando a la preview de Lovable es solo para desarrollo — al publicar en tiendas hay que quitarlo para que la app empaquete los assets locales.

## Detalles técnicos

- Dedupe: `external_uuid` viene del propio HealthKit/Health Connect (`UUID` del sample), garantiza idempotencia.
- Ventana de sincronización: desde `profiles.health_last_synced_at` hasta `now()`, con límite máximo de 30 días si nunca se sincronizó.
- Permisos granulares: se solicitan solo los tipos de dato activados por el usuario, no todo el HealthKit.
- Impersonación: si un `medico` está viendo a un paciente, el panel es **read-only** — solo el propio paciente puede conectar/desconectar.