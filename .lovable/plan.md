
# Plan — "Bienestar Móvil": Expediente Digital + Rediseño 4T + IMSS

Trabajo dividido en fases para no romper nada. **Esta entrega cubre Fase 1 + Rediseño visual + IMSS como aseguradora.** CFDI (Facturama) y módulo Uber quedan planificados aparte.

---

## FASE 1 — Expediente Digital (consolidar módulos clínicos)

### Objetivo
Unificar **Medicamentos, Recetas, Estudios, Tendencias, Presión Arterial, Oxigenación (SpO2) y Registros Médicos** en una sola sección **Expediente Digital** en `/expediente`.

### Menú principal final (paciente)
- Panel de Paciente (`/`)
- Reclamos (`/reclamos`)
- Agenda (`/agenda`)
- **Expediente Digital** (`/expediente`) ← nueva
- Pólizas (`/polizas`)
- Formatos (`/formatos`)
- Perfil (`/perfil`)

Las rutas viejas siguen funcionando, solo se ocultan del menú.

### Nueva página: `src/pages/ExpedienteDigital.tsx`
Panel con tabs (desktop) / acordeón (mobile):

```text
+-------------------------------------------------------+
|  Expediente Digital                                   |
+-------------------------------------------------------+
| [Resumen][Medicamentos][Recetas][Estudios]            |
| [Tendencias][Presión][Oxigenación][Registros]         |
+-------------------------------------------------------+
| Contenido del tab activo (reusa componentes)          |
+-------------------------------------------------------+
```

- Tab "Resumen": KPIs con últimas mediciones + sparklines.
- Resto: monta los componentes/páginas existentes sin duplicar lógica.

### Cambios
1. Crear `src/pages/ExpedienteDigital.tsx` con shadcn `Tabs`.
2. Agregar feature `"expediente_digital"` en `src/lib/features.ts`.
3. Ruta `/expediente` en `src/App.tsx`.
4. Limpiar `AppSidebar.tsx` y `BottomNav.tsx` para mostrar solo los 7 ítems del menú.
5. Refactor mínimo si hace falta extraer cuerpos de páginas a componentes reutilizables.

---

## NUEVO — Aseguradora IMSS

### Objetivo
Agregar **IMSS** al catálogo de aseguradoras junto a las 10 actuales, crear su carpeta en Storage y un formato genérico de ejemplo.

### Cambios
1. **Migración SQL**: insertar IMSS en `aseguradoras` con `carpeta_storage = 'IMSS'`.
2. **Constante**: agregar `"IMSS"` al array `ASEGURADORAS` en `src/lib/constants.ts` (queda al inicio, alfabético).
3. **Carpeta storage**: crear `IMSS/` dentro del bucket público `formatos/` subiendo un placeholder `.keep`.
4. **PDF genérico de ejemplo**: generar un PDF simple "Solicitud de Atención Médica IMSS — Formato Genérico" con campos típicos (nombre, NSS, CURP, derechohabiente, médico, diagnóstico, firma) usando reportlab. Subirlo a `formatos/IMSS/solicitud-atencion-medica-generica.pdf`.
5. **Registro en BD**: insertar fila en `formularios` (o tabla equivalente) apuntando a ese PDF para que aparezca en el árbol del Gestor de Formatos y en la página `/formatos` del paciente.
6. Verificar que `InsurerTree.tsx` lo lista automáticamente (ya consulta `useAseguradoras()`, así que sale solo).

### Nota
Este formato es **un placeholder de ejemplo**. Para reclamos reales con IMSS necesitarás el formato oficial vigente del instituto; podemos reemplazarlo después subiéndolo desde el Gestor de Formatos del admin.

---

## REDISEÑO VISUAL — "Bienestar Móvil" (paleta 4T)

### Inspiración
Identidad visual Gobierno de México 4T / Bienestar:
- **Guinda institucional** primario
- **Dorado** acento
- **Crema/marfil** fondo cálido
- Sensación oficial pero amable

### Paleta nueva (HSL para `index.css`)

```text
--primary:        345 65% 28%   guinda  (#7A1F3D)
--primary-foreground: 45 65% 92%
--accent:         42 75% 52%    dorado  (#D4A02A)
--accent-foreground: 345 65% 15%
--background:     40 30% 97%    crema   (#FAF6EE)
--foreground:     345 30% 15%
--muted:          40 25% 92%
--success:        142 50% 35%
--warning:        25 85% 50%
--destructive:    0 65% 45%
--ring:           345 65% 28%
```

Modo oscuro: guinda profundo de fondo, dorado de acento.

### Tipografía
Mantengo **Sora (headings) + Manrope (body)** que ya están cargadas y combinan con la nueva paleta.

### Identidad
- **Nombre**: "Bienestar Móvil" (reemplaza "MediClaim").
- **Logo**: SVG simple — monograma "BM" en guinda con detalle dorado tipo sello institucional.
- **Tagline**: "Tu salud, tu expediente, en tu mano."

### Preview antes de aplicar
Te genero un **PNG de muestra** con:
- La paleta aplicada
- Logo propuesto
- Mock del Panel de Paciente
- Mock del menú nuevo
- IMSS visible en el listado de aseguradoras

Lo verás como artifact descargable. Si te gusta seguimos; si no, ajustamos y regeneramos antes de tocar código.

### Cambios técnicos del rediseño
1. Generar preview PNG → mostrar.
2. **Esperar tu OK.**
3. Actualizar `src/index.css` con la nueva paleta HSL.
4. Reemplazar "MediClaim" → "Bienestar Móvil" en `index.html`, `Login.tsx`, `AppLayout.tsx`.
5. Crear `public/logo-bienestar.svg` y usarlo en sidebar/login.
6. Actualizar memoria (`mem://design/tokens` + `mem://index.md`).

---

## Fuera de esta entrega (planificadas para próximas)

### FASE 2 — CFDI 4.0 con Facturama
- Pedir API Key Facturama (sandbox) vía `add_secret`.
- Sección **CFDI** en panel del médico.
- Tabla `cfdi_invoices` + bucket privado para XML/PDF.
- Sección "Datos de facturación" en perfil paciente y médico.
- Edge function `cfdi-emit` → Facturama API.
- Flujo médico: elegir paciente registrado (autocompleta) o no registrado (captura manual) → conceptos → timbrar → enviar por **WhatsApp / Email / Plataforma**.
- CFDIs recibidos visibles en Expediente del paciente.

### FASE 3 — "Bienestar Movilidad" tipo Uber
- Roles nuevos: chofer, conductor, chofer_propietario.
- Tablas: vehicles, driver_profiles, trips, trip_offers, vehicle_rentals.
- MVP: viajes a citas médicas integrado con `/agenda`. Tracking real-time con Supabase Realtime y Mapbox/Google Maps.
- Pagos por viaje con Stripe en iteración posterior.

---

## Tareas concretas tras tu aprobación

1. Crear `ExpedienteDigital.tsx` con tabs.
2. Agregar feature key + ruta.
3. Limpiar Sidebar + BottomNav.
4. Migración SQL: insertar IMSS en `aseguradoras`.
5. Agregar "IMSS" en `constants.ts`.
6. Generar PDF genérico IMSS y subirlo a `formatos/IMSS/`.
7. Registrar el formulario IMSS en BD.
8. Generar preview PNG del rediseño Bienestar Móvil.
9. **Pausar y esperar tu OK al diseño.**
10. Aplicar paleta + renombrar app + logo.
11. Actualizar memoria del proyecto.

¿Procedo? Cuando termine me decís si arrancamos **Fase 2 (CFDI/Facturama)** o **Fase 3 (Movilidad tipo Uber)**.
