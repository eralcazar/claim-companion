
# Ampliación de conectividad de dispositivos

Cuatro entregables independientes bajo `/dispositivos`, sin tocar monitores clínicos existentes ni el parser BLE actual de presión/oximetría.

---

## 1. Catálogo ampliado de dispositivos clínicos BLE

Editar `src/lib/ble/compatibleDevices.ts` para agregar fichas con métricas soportadas explícitas.

**Nuevos dispositivos** (todos con servicio GATT estándar, marcar `verified` los conocidos y `probable` el resto):

- **Oxímetros** (servicio `0x1822` Pulse Oximeter):
  - Wellue O2Ring (anillo continuo nocturno) — verified
  - Wellue Checkme O2 Max — probable
  - Viatom PC-60FW — probable
  - Contec CMS50D-BT — probable

- **Tensiómetros** (servicio `0x1810` Blood Pressure) — complementar los ya existentes:
  - A&D UA-651BLE — probable
  - iHealth Track KN-550BT — probable
  - Beurer BM 81 easyLock — probable

- **Anillos / sensores continuos**:
  - Wellue O2Ring Gen2 — verified
  - Circul+ Ring — probable (SpO₂ + FC)

- **Cinturones/bandas de pecho FC** (servicio `0x180D` Heart Rate) — nueva subcategoría:
  - Polar H10 — verified
  - Polar H9 — verified
  - Garmin HRM-Pro Plus — probable
  - Wahoo TICKR / TICKR X — probable
  - CooSpo H6/H808S — probable

**Cambio de esquema del catálogo:** agregar campo `metrics: MetricKey[]` a cada entrada (`heart_rate | spo2 | blood_pressure | temperature | glucose`) y `category: "watch" | "band" | "oximeter" | "bp" | "ring" | "chest_strap" | "thermometer" | "glucometer"`.

Actualizar `DispositivosCompatibles.tsx` para mostrar chips de métricas y un filtro por categoría.

---

## 2. Asistente Health Connect (Xiaomi / Samsung)

Nuevo componente `src/components/health/HealthConnectSetupWizard.tsx` — modal multi-paso con imágenes/iconos y checkboxes de confirmación. Pasos:

1. Instalar Health Connect (Play Store) — solo Android 13-. En Android 14+ ya viene integrado.
2. Instalar la app puente (**Mi Fitness** para Xiaomi / **Samsung Health** para Samsung/Galaxy).
3. Emparejar el wearable dentro de la app puente y sincronizar una vez.
4. Abrir Health Connect → **Apps y permisos** → habilitar la app puente para lectura+escritura de FC, SpO₂, pasos, sueño.
5. Autorizar CareCentral (botón en el wizard que dispara `requestHealthPermissions()`).
6. Correr una **prueba de conexión** integrada (llama al `WearableConnectionTest` existente) y mostrar qué métricas llegaron.

Persistir "wizard completado" en `localStorage`. Entrada desde `/dispositivos` (nueva pestaña **Asistente**) y también como CTA en la ficha de dispositivos Xiaomi/Samsung.

Variantes: si el usuario está en iOS mostrar aviso "En iPhone se usa Apple Health" y saltar al wizard equivalente ya existente. Si está en web mostrar "Requiere la app móvil de CareCentral".

---

## 3. Soporte BLE directo para Heart Rate GATT (0x180D)

Extender `src/lib/ble/` con un nuevo parser sin tocar los actuales:

- Nuevo archivo `src/lib/ble/heartRate.ts`:
  - Función `connectHeartRateSensor()` que usa `navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] })`.
  - Suscribe a la característica `heart_rate_measurement` (notify) y decodifica el flag byte + BPM (uint8 o uint16 según flag) + intervalos RR opcionales.
  - Callback `onReading({ bpm, rrIntervals, contact, timestamp })`.
  - Manejo de desconexión (`gattserverdisconnected`) con auto-reconnect opcional.

- Nuevo componente `src/components/ble/HeartRateLiveMonitor.tsx`:
  - Botón "Conectar sensor" → muestra BPM en vivo, gráfica sparkline de últimos 60s, indicador de contacto.
  - Botón "Guardar sesión" → inserta en `heart_rate_readings` con `source='ble_direct'`, `device_name` del dispositivo.
  - Botón "Detener".

- Integración: agregar la tarjeta en `HeartRateMonitor.tsx` como sección "Sensor BLE en vivo" (colapsable), sin alterar el registro manual ni el histórico.

---

## 4. Verificador de compatibilidad BLE directo

Nueva pestaña **BLE directo** en `/dispositivos` que ejecuta un chequeo del entorno:

Nuevo componente `src/components/ble/DirectBleChecker.tsx` que evalúa:

- ✅/❌ Web Bluetooth disponible (`navigator.bluetooth`).
- ✅/❌ HTTPS o localhost (requisito de la Web Bluetooth API).
- ✅/❌ Plataforma (Chrome/Edge Android o desktop = OK; iOS Safari = no soportado).
- ✅/❌ Permisos otorgados previamente (`navigator.bluetooth.getAvailability()`).
- Lista de servicios GATT que CareCentral sabe leer (presión, oximetría, FC, termómetro, glucosa) con su estado (parser implementado / pendiente).

Botón **"Escanear dispositivo cercano"** que reutiliza la lógica existente en `BleCompatibilityCheck.tsx` pero extiende la detección para reportar cuál de los parsers de CareCentral podría manejarlo. Muestra un resultado tipo:

```text
Dispositivo detectado: Polar H10
Servicio: Heart Rate (0x180D)  → parser disponible ✅
Acción: Conectar en "Frecuencia cardiaca → Sensor BLE en vivo"
```

Si el dispositivo expone servicio propietario, sugiere el flujo puente (Health Connect / Apple Health) con link al wizard del punto 2.

---

## Detalles técnicos

**Archivos nuevos**
- `src/lib/ble/heartRate.ts`
- `src/components/ble/HeartRateLiveMonitor.tsx`
- `src/components/health/HealthConnectSetupWizard.tsx`
- `src/components/ble/DirectBleChecker.tsx`

**Archivos modificados**
- `src/lib/ble/compatibleDevices.ts` — nuevas entradas + campos `metrics`, `category`
- `src/pages/DispositivosCompatibles.tsx` — nuevas pestañas **Asistente** y **BLE directo**, filtro por categoría
- `src/pages/HeartRateMonitor.tsx` — sección colapsable con `HeartRateLiveMonitor`
- `src/components/ble/BleCompatibilityCheck.tsx` — extender resultado para mapear servicio → parser disponible

**Datos**
- No hay cambios de esquema en la base. Las lecturas del sensor HR BLE se insertan en la tabla `heart_rate_readings` existente usando `source='ble_direct'`.

**Fuera de alcance**
- No se modifican los parsers de presión/oximetría existentes.
- No se agrega parseo de Xiaomi/Samsung propietario (imposible sin ingeniería inversa).
- No se toca el módulo de ejercicios ni el AI coach.
- No se agregan glucómetros nuevos (el catálogo GATT 0x1808 queda como está).
