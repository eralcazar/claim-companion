
## Evaluación del estado actual

| # | Requisito | Estado | Evidencia |
|---|-----------|--------|-----------|
| 1 | Planes nutricionales semanales con porciones y alternativas | ❌ **Falta** | `Nutricion.tsx` solo tiene Métricas + Semáforo de alimentos. No hay tabla `meal_plans` ni UI de plan semanal. |
| 2 | Expediente clínico con antropometría y evolución | ✅ **Existe** | `nutrition_metrics` (peso, IMC, % grasa, agua, cintura, cadera) + gráfica de evolución en `MetricsTab`. Historial clínico global en módulo Historial Médico. |
| 3 | Agenda con recordatorios automáticos para el paciente | ⚠️ **Parcial** | Existe módulo `Appointments` + tabla `notifications` + push tokens + recordatorios BP. **Falta**: cron job que envíe recordatorio automático 24h/1h antes de cada cita. |
| 4 | Export de planes en PDF profesional | ❌ **Falta** | Hay generación PDF para recetas, reclamos, facturas y frecuencia cardíaca — no para plan nutricional. |
| 5 | Período de prueba gratuito | ✅ **Existe** | Paquete "Gratuito" auto-asignado en `handle_new_user` (5 OCR/mes) según memoria del proyecto. |
| 6 | Soporte técnico en español | ⚠️ **Parcial** | Toda la UI ya está en español. **Falta**: página `/soporte` con canales de contacto y SLA. |
| 7 | Cumplimiento con protección de datos personales | ✅ **Existe** | `/legal` (aviso privacidad + LFPDPPP), consentimientos (`consents`), `arco_requests`, integridad NOM-024, `ai_feature_consents`, pantalla `/mis-datos-ia`. |
| 8 | Actualizaciones frecuentes | ✅ **Continuo** | Sprints activos documentados. No requiere código; se puede exponer un changelog. |
| 9 | Funciona en la nube desde cualquier dispositivo | ✅ **Existe** | Lovable Cloud + PWA + mobile-first + Capacitor. |
| 10 | Gestionar múltiples consultorios | ⚠️ **Parcial** | Existe `professional_locations` con CRUD en `AvailabilityEditor` para marketplace. **Falta**: selector global de consultorio activo y filtro por sede en citas/facturación. |

## Cambios propuestos (solo lo que falta o está parcial)

### A. Planes nutricionales semanales (nuevo)
- **DB**: tablas `nutrition_meal_plans` (id, patient_id, professional_id, titulo, fecha_inicio, fecha_fin, kcal_objetivo, notas) y `nutrition_meal_plan_items` (plan_id, dia_semana 0-6, momento `desayuno|colacion_am|comida|colacion_pm|cena`, alimento, porcion, unidad, kcal, alternativas jsonb, orden). GRANTs + RLS: paciente lee su plan, nutricionista/medico crea/edita.
- **UI**: nueva pestaña "Plan semanal" en `Nutricion.tsx` con grilla 7×5 (días × momentos), diálogo por celda con alimento + porción + hasta 3 alternativas, duplicar semana, activar/desactivar plan.
- **Hook**: `useMealPlan.ts` con React Query.

### B. PDF profesional del plan (nuevo)
- `src/components/nutricion/MealPlanPdfExport.tsx` con jsPDF + autoTable: encabezado con logo CareCentral, datos paciente, kcal objetivo, tabla semanal por momento, alternativas en pie de celda, notas del nutricionista, firma/cédula profesional, footer legal.

### C. Recordatorios automáticos de citas (completar)
- Edge function `appointment-reminders-cron` que corre cada 15 min, busca citas en ventana 24h y 1h, e inserta filas en `notifications` + push (usa `usePushNotifications` existente).
- Programar con `pg_cron` (activar `pg_cron` y `pg_net`) via SQL directo (insert tool), no migración, porque contiene URL/anon key.
- Añadir preferencia en `notification_preferences`: `remind_appointment_24h`, `remind_appointment_1h`.

### D. Multi-consultorio activo (completar)
- Contexto `ActiveLocationContext` con selector en header (dropdown de `professional_locations` del profesional).
- Filtro por `location_id` en listado de citas, POS farmacia y facturación cuando `active_role` sea profesional. Persistir en `localStorage`.
- Pequeño CRUD `/consultorios` (listar/editar/agregar sedes) reutilizando `AvailabilityEditor`.

### E. Página de soporte (nuevo, ligero)
- `src/pages/Soporte.tsx` en `/soporte`: canales (email, WhatsApp), horario, tiempos de respuesta por plan, formulario que crea entrada en `notifications` para el admin y enlace a docs. Añadir link en `AppSidebar` y footer del Landing.

## Detalles técnicos

- Sin cambios a `client.ts`, `types.ts` ni `config.toml`.
- Todas las tablas nuevas del schema `public` incluyen bloque GRANT + RLS + policies antes de habilitar.
- Reutilizar `CareCentralLogo`, tokens semánticos (`--primary` teal, `--accent` cyan) y `Manrope`/`Inter` — no hardcodear colores.
- El cron usará `insert` tool (no migración) porque incluye anon key del proyecto.
- Push notifications: reutilizar `usePushNotifications` + tabla `user_push_tokens`.

## Fuera de alcance

- Cambios en el modelo de billing/trial (ya está implementado).
- Integraciones nuevas de IA (el coach nutricional puede añadirse en un sprint posterior sobre estas tablas).
- Rediseño del módulo de citas — solo se añaden recordatorios automáticos.
