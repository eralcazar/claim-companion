# Adición al Macro Plan: Marketplace de Especialistas "Mejor que Doctoralia"

Convertir CareCentral en un marketplace público de salud + expediente clínico integrado. Doctoralia solo agenda; nosotros agendamos, monitoreamos, facturamos, dispensamos y damos seguimiento clínico real.

## Qué copiamos de Doctoralia
- Landing pública con buscador central (especialidad + ciudad/CP).
- Perfiles públicos SEO-friendly de médicos, enfermeros, laboratorios, farmacias.
- Reseñas verificadas con estrellas.
- Reserva online sin registro previo (guest booking).
- Filtros: seguro aceptado, precio, idioma, telemedicina, disponibilidad hoy.
- Mapa con resultados cercanos.

## Qué hacemos MEJOR (diferenciadores)
1. **Reseñas 100% verificadas** — solo pacientes con `appointment.status = completed` pueden reseñar (Doctoralia acepta cualquiera).
2. **Expediente clínico continuo** — tras la consulta el paciente se lleva su expediente firmado con hash chain (NOM-024). Doctoralia no guarda nada.
3. **Precio transparente + comparador** — mostrar rango real basado en `pharmacy_prices` y tarifas del profesional; incluir estimación con seguro.
4. **Kari AI triage** — antes de agendar, Kari sugiere especialidad correcta según síntomas y urgencia.
5. **Video consulta nativa** — con receta electrónica firmada, estudios solicitados y cobro en un solo flujo.
6. **Home visit / dispatch** — botón "visita a domicilio" (enfermería, toma de muestras, médico general).
7. **Integración total** — el mismo perfil vende consultas, recibe pagos con CFDI, factura, entrega recetas a farmacia y sincroniza wearables BLE del paciente.
8. **Insurance auto-claim** — al terminar la consulta se pre-llena el formato MetLife/GNP automáticamente.

## Nuevo Mega-turno: "Marketplace Público"

### Sprint MK-1 · Perfiles públicos + búsqueda
- Tabla `professional_profiles` (slug, bio, foto, especialidades[], seguros_aceptados[], idiomas[], años_experiencia, cédula_prof, ubicaciones[], precio_base, acepta_video, acepta_domicilio, rating_avg, rating_count).
- Tabla `professional_locations` (lat/lng, dirección, horarios).
- Tabla `specialties` catálogo (con sinónimos ES para búsqueda).
- Rutas públicas: `/buscar`, `/especialista/:slug`, `/especialidad/:slug`, `/ciudad/:slug`.
- Landing rediseñada con hero-buscador tipo Doctoralia: input especialidad + input ciudad + botón Buscar.
- SEO: sitemap dinámico, JSON-LD `Physician`/`MedicalBusiness`, meta por perfil.

### Sprint MK-2 · Reserva guest + reseñas
- Booking sin cuenta (email/tel). Al confirmar se crea `profiles` en modo lite y se envía magic link.
- `appointment_reviews` (rating 1-5, texto, verified=true solo si appointment completado).
- Moderación admin de reseñas reportadas.
- Widget de disponibilidad next-7-days por profesional.

### Sprint MK-3 · Triage Kari + video + pagos
- `/triage` — chat con Kari que devuelve especialidades sugeridas + urgencia (verde/amarillo/rojo).
- Video consultation con LiveKit/Daily (edge function para tokens).
- Checkout Stripe con split: comisión plataforma + payout profesional (Stripe Connect).
- Post-consulta: receta digital + estudios + factura CFDI + pre-llenado seguro, todo en un solo flujo.

### Sprint MK-4 · Dispatch + mapa
- `service_requests` (tipo: visita_medica, enfermeria, toma_muestra, farmacia_delivery).
- Matching por geolocalización + disponibilidad.
- Tracking en vivo (Mapbox) del profesional/repartidor.
- Ratings post-servicio.

## Detalles técnicos (para el equipo)

**Stack añadido:** Mapbox GL, LiveKit (video), Stripe Connect Express, Algolia o `pg_trgm` para búsqueda tolerante a errores.

**RLS clave:**
- `professional_profiles`: SELECT público solo si `published=true`; UPDATE solo owner.
- `appointment_reviews`: SELECT público; INSERT solo paciente con cita completada (validar en trigger).
- `service_requests`: SELECT dueño + profesional asignado + admin.

**SEO/perf:** SSR no aplica (Vite SPA) — usar `react-helmet-async` + prerender de las top 500 URLs vía script build-time hacia `dist/` para Googlebot.

**Migración de nav:** nueva sección "Marketplace" en sidebar; landing pública cambia de simple a hero-buscador manteniendo tokens actuales (teal/navy).

## Orden sugerido
Terminar Mega-turno 2 pendiente (e-commerce farmacia, dispatch, clientes) → luego arrancar Marketplace MK-1. Alternativa: intercalar MK-1 ya porque es el mayor generador de tráfico/usuarios.

## Pregunta
¿Arrancamos **MK-1 (perfiles públicos + búsqueda)** ahora, o primero cierro **Mega-turno 2** de farmacia?
