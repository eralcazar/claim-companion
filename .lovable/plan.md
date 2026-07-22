## Objetivo

Añadir una guía paso a paso específica **"Conectar Mi Fitness con Health Connect / Apple Health"** dentro de la ficha del dispositivo (`DeviceDetailSheet`), visible para los dispositivos Xiaomi que dependen del puente Mi Fitness (actualmente Band 9 y Band 10).

## UI

Nueva sección en `src/components/ble/DeviceDetailSheet.tsx`, justo debajo de "Instrucciones de emparejamiento":

- Bloque colapsable (Accordion de shadcn) con título "Guía: Mi Fitness → Health Connect / Apple Health".
- Adentro, `Tabs` con dos pestañas:
  - **Android (Health Connect)** — lista ordenada con pasos concretos: instalar Mi Fitness desde Play Store, iniciar sesión con Mi Account, emparejar la banda en Mi Fitness → Perfil → Añadir dispositivo, activar sincronización con Health Connect en Mi Fitness → Perfil → Ajustes → Servicios de terceros → Health Connect, otorgar permisos (Frecuencia cardíaca, SpO₂, Pasos, Sueño), abrir CareCentral → Historial de salud → Sincronizar wearables → Health Connect, autorizar los mismos permisos, pulsar Sincronizar ahora.
  - **iOS (Apple Salud)** — nota clara de que Mi Fitness en iOS **no escribe** en HealthKit directamente y sugiere usar la app "Zepp Life" o "Notify & Fitness for Mi Band" como puente hacia Salud, con pasos: instalar la app puente, emparejar la banda ahí, activar la escritura en la app Salud, abrir CareCentral iOS → Historial de salud → Conectar HealthKit, autorizar lectura, sincronizar.
- Cada paso con numeración estilizada (reutilizar el patrón visual de "Instrucciones de emparejamiento": círculo con índice + texto).
- Nota final tipo `Alert` con enlace a `/dispositivos-compatibilidad` para registrar el resultado de la prueba.

## Visibilidad

Renderizar solo cuando `device.syncSource.toLowerCase().includes("mi fitness")`. Así se activa automáticamente para Band 9, Band 10 y futuros modelos Xiaomi.

## Archivos

- `src/components/ble/MiFitnessBridgeGuide.tsx` (nuevo): componente autocontenido con Accordion + Tabs + pasos como arrays constantes.
- `src/components/ble/DeviceDetailSheet.tsx`: importar y renderizar `<MiFitnessBridgeGuide />` bajo la sección de instrucciones cuando aplique.

## Fuera de alcance

- No se cambia el catálogo ni `pairingSteps` existentes.
- No se toca lógica de sincronización ni edge functions.
- No se generaliza aún la guía para otras marcas (Haylou, Amazfit) — se puede replicar después con el mismo patrón.
