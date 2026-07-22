## Objetivo

Que el usuario, al abrir la **Xiaomi Smart Band 10** en el catálogo, vea claramente:

1. Qué mediciones expone dentro de CareCentral (FC, SpO₂, actividad, sueño).
2. Qué tan confiable es cada una en uso clínico dentro de la app.

## Cambios de datos (sin migración)

Extender el tipo `CompatibleDevice` en `src/lib/ble/compatibleDevices.ts` con un campo opcional:

```ts
readingReliability?: Partial<Record<CompatibleReading, {
  level: "clinical" | "reference" | "informational";
  note?: string;
}>>;
```

Semántica visible al usuario:
- **Clínica** — apta para seguimiento y alertas médicas.
- **Referencial** — útil para tendencias, no reemplaza equipo clínico.
- **Informativa** — solo estilo de vida / bienestar.

Rellenar el objeto para `xiaomi-band-10` con:
- `heart_rate` → **referencial** ("Óptico de muñeca; buena tendencia en reposo, menor precisión en ejercicio intenso").
- `spo2` → **informativa** ("Medición puntual bajo demanda; no válida para diagnóstico. Confirmar con oxímetro dedicado si <94%").
- `activity` → **referencial** ("Pasos y calorías estimadas por acelerómetro").
- `sleep` → **informativa** ("Estimación por movimiento + FC; no equivale a polisomnografía").

## UI

En `src/components/ble/DeviceDetailSheet.tsx`, reemplazar el bloque actual "Mediciones" (badges simples) por una tarjeta **"Métricas soportadas y confiabilidad"** cuando el dispositivo tenga `readingReliability`. Para cada reading listada:

- Ícono/etiqueta de la métrica (usa `READING_LABELS`).
- Badge de nivel (color por nivel: emerald=clinical, amber=reference, slate=informational).
- Nota breve.

Si el dispositivo no define `readingReliability`, se mantiene el render actual (fallback) — así el cambio no afecta al resto del catálogo.

Añadir un pie corto: *"La confiabilidad la define el equipo CareCentral según el protocolo de sincronización y validaciones internas."*

## Archivos

- `src/lib/ble/compatibleDevices.ts` — tipo extendido + campo poblado en la Band 10.
- `src/components/ble/DeviceDetailSheet.tsx` — nueva tarjeta de métricas + confiabilidad.

## Fuera de alcance

- No se cambian otros dispositivos (se puede replicar más adelante).
- No hay cambios de base de datos ni de flujos de sincronización.
