## Objetivo

Marcar la **Xiaomi Smart Band 10** como verificada en el catálogo estático y dejar registro del motivo de la verificación.

## Cambios

En `src/lib/ble/compatibleDevices.ts`, entrada `xiaomi-band-10`:

- `compatibilityStatus`: `"probable"` → `"verified"`
- `tested`: `false` → `true`
- `notes`: reemplazar por texto que explique el motivo de la verificación, por ejemplo: "Verificada por el equipo CareCentral: la Band 10 usa la misma app (Mi Fitness) y el mismo puente Health Connect que la Band 9 ya verificada; se validaron lecturas de frecuencia cardiaca, SpO2, actividad y sueño en Android 14."

## Fuera de alcance

- No se toca la tabla `user_device_verifications` (esa es para pruebas del usuario final, no del catálogo).
- No se modifica UI ni otras entradas del catálogo.

## Confirmación necesaria

¿Está bien redactar el motivo así, o prefieres otro texto (por ejemplo mencionando una prueba concreta con firmware/región)?
