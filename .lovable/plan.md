# Plan agresivo — CareCentral: la mejor app de monitoreo y expediente clínico de México

Objetivo: cumplir NOM-024-SSA3, NOM-004-SSA3, LFPDPPP y buenas prácticas HIPAA/GDPR, con interoperabilidad HL7 FHIR R4, integridad criptográfica, monitoreo remoto continuo y accesibilidad total. Ejecutable en ~6 sprints.

---

## Sprint 1 — Cumplimiento legal y consentimientos (base NOM-024)

1. **Aviso de Privacidad Integral** (`/legal/aviso-privacidad`) con secciones LFPDPPP + derechos ARCO + cookies.
2. Checkbox obligatorio de aceptación en `Login.tsx` para nuevo registro → columna `profiles.privacy_accepted_at` + `privacy_version`.
3. **Consentimiento de tratamiento médico** firmado con `SignatureCanvas`, guardado como PDF en `documents/consents/{patient_id}/{ts}.pdf` + tabla `consents` (versionada).
4. **Consentimiento específico** por acción sensible: telemedicina, compartir con broker/aseguradora, uso de datos para IA (Kari).
5. Validación estricta: **CURP** (regex + dígito verificador) en `profiles`, **cédula profesional** en `medicos` con verificación opcional vía scraping DGP.
6. Página `/legal/derechos-arco` con formulario para ejercer Acceso, Rectificación, Cancelación, Oposición.
7. Documento `/legal/politica-retencion` (≥5 años NOM-004) y `/legal/politica-respaldo` (RPO 24h, RTO 4h).

## Sprint 2 — Integridad, no repudio y bitácora inalterable

8. Columna `signature_hash` + `signed_by` + `signed_at` + `prev_hash` en tablas clínicas críticas: `medical_records`, `recetas`, `estudios_solicitados`, `resultados_estudios`, `medical_alerts`, `procedures_log`, `surgeries`.
9. Función `sign_clinical_record(table, id)` que calcula SHA-256 del contenido normalizado + firma con clave privada del profesional (almacenada cifrada en `firmas_usuario`).
10. **Encadenamiento hash tipo blockchain ligera**: cada registro guarda el hash del anterior en su misma tabla → función `verify_audit_chain()` detecta manipulaciones.
11. Extender `audit_logs` para registrar **lecturas** (SELECT) de expediente por personal vía RPC `record_access(patient_id, table, record_id, reason)`.
12. RLS `FOR DELETE USING (false)` en `audit_logs` y `data_access_log`; particionar por mes para escalabilidad.
13. **Sellado de tiempo confiable** con TSA gratuita (freeTSA.org) para notas clínicas firmadas.
14. Panel `/admin/integridad` con verificación de cadena y evidencia exportable en PDF.

## Sprint 3 — Interoperabilidad semántica (catálogos oficiales mexicanos)

15. Tablas catálogo cargadas por seed: `cat_cie10`, `cat_cie9mc`, `cat_cieo` (oncología), `cat_loinc`, `cat_snomed_ct` (subset ES-MX), `cat_cum` (medicamentos COFEPRIS), `cat_clues` (establecimientos), `cat_edumex` (educación en salud).
16. Componentes reutilizables: `<Cie10Combobox/>`, `<CumCombobox/>`, `<LoincCombobox/>`, `<SnomedCombobox/>` con búsqueda difusa + código.
17. Migrar campos libres a codificados en: diagnósticos (`medical_history_conditions`), estudios (`estudios_solicitados.loinc`), medicamentos (`medications.cum`, `receta_items.cum`), procedimientos (`procedures_log.cie9mc`).
18. Edge function `import-catalogos` para actualizaciones periódicas desde DGIS.

## Sprint 4 — Interoperabilidad técnica HL7 FHIR R4 + HL7 CDA R2

19. Edge function `export-fhir-bundle` que exporta por paciente un **Bundle FHIR R4** completo: Patient, Practitioner, Organization, Encounter, Observation (signos vitales BLE), Condition, AllergyIntolerance, MedicationRequest, MedicationStatement, DiagnosticReport, Procedure, Immunization, DocumentReference.
20. Edge function `import-fhir-bundle` para recibir expedientes de otros SIRES (validación con `@medplum/fhir-schemas`).
21. Exportación **HL7 CDA R2** para intercambio con IMSS/ISSSTE/SSA.
22. Endpoint público autenticado `/fhir/[resource]` estilo REST FHIR compatible con SMART-on-FHIR (OAuth2 + scopes).
23. Documento `/docs/interoperabilidad` con mapeo interno ↔ FHIR y ↔ CDA.

## Sprint 5 — Monitoreo remoto continuo y alertas inteligentes

24. **Modo hospitalario en tiempo real** con Supabase Realtime: dashboard `/monitoreo` para enfermería con signos vitales de todos los pacientes asignados, códigos de color por severidad y alertas sonoras.
25. Motor de reglas clínicas `clinical_rules_engine` (edge function): sepsis (qSOFA), NEWS2, MEWS, hipoglucemia, hipertensión maligna, desaturación → generan `medical_alerts` con severidad automática.
26. **Predicción con IA** (Lovable AI Gateway, modelo `google/gemini-2.5-flash`): análisis de tendencias BLE para detectar deterioro antes de que ocurra (ej. fibrilación auricular por variabilidad de pulso).
27. Escalamiento automático: alerta crítica sin atender en X min → notifica supervisor → médico → familiar.
28. Integración **Twilio/WhatsApp Business** para alertas críticas a familiares (secret `TWILIO_*`).
29. **Modo offline PWA** con IndexedDB para captura sin conexión y sincronización posterior (crítico para zonas rurales).

## Sprint 6 — Accesibilidad universal y UX inclusiva

30. Auditoría WCAG 2.2 AA completa: contraste, foco visible, ARIA labels, navegación por teclado.
31. **Modo alto contraste** y **tamaño de fuente ajustable** (14/16/20/24 px) persistido en `profiles.a11y_settings`.
32. **Text-to-Speech** con Lovable AI (`google/gemini-2.5-flash-tts`) para adultos mayores y baja visión: escuchar notas, recetas y recordatorios.
33. **Speech-to-Text** para dictado clínico en consulta (`STT` de Lovable AI).
34. Traducción a **lenguas indígenas** (náhuatl, maya, tzotzil, mixteco) para textos clave vía IA.
35. **Lectura simplificada**: modo "explicación para paciente" que reescribe notas médicas en lenguaje llano.
36. **Modo dislexia**: fuente OpenDyslexic + espaciado ampliado.

## Sprint 7 — Seguridad avanzada y hardening

37. **MFA obligatorio** (TOTP) para roles clínicos y admin.
38. **Cifrado en reposo a nivel campo** (pgcrypto) para: CURP, RFC, teléfono, dirección, notas psiquiátricas.
39. **Detección de anomalías**: login desde IP nueva, descargas masivas de expedientes, accesos fuera de horario → alerta admin.
40. Rate limiting global en edge functions con `Upstash Redis`.
41. Rotación automática de `LOVABLE_API_KEY` y `firmas_usuario` cada 90 días.
42. **Bug bounty público** con formulario en `/security/report` y RFC 9116 (`/.well-known/security.txt`).
43. Corrección de todas las advertencias del `supabase--linter` en cero.

## Sprint 8 — Reportería, KPIs y certificación

44. Dashboard `/admin/nom024` con KPIs en vivo: % diagnósticos codificados, % notas firmadas, integridad de cadena hash, exportaciones FHIR generadas, lecturas de expediente auditadas, tiempos de respuesta a alertas críticas.
45. **Exportables COFEPRIS/DGIS**: reporte trimestral automatizado en el formato oficial.
46. Panel de indicadores clínicos: adherencia a tratamiento, control glucémico HbA1c estimada, control de HTA, cobertura de vacunación.
47. **Bitácora completa por paciente** exportable en PDF firmado para inspecciones.
48. Preparación de evidencia para certificación **ISO 27001**, **ISO 13485** (dispositivos médicos) e **ISO 82304-1** (health software).

---

## Detalles técnicos

- **Tablas nuevas** (~20): `consents`, `privacy_acceptances`, `data_access_log`, `clinical_notes`, `cat_cie10`, `cat_cie9mc`, `cat_cieo`, `cat_loinc`, `cat_snomed_ct`, `cat_cum`, `cat_clues`, `clinical_rules`, `clinical_rule_hits`, `mfa_secrets`, `security_incidents`, `family_contacts`, `escalation_policies`, `offline_sync_queue`, `a11y_preferences`, `fhir_exports_log`.
- **Funciones/RPCs**: `sign_clinical_record`, `verify_audit_chain`, `record_access`, `evaluate_clinical_rules`, `encrypt_pii`, `decrypt_pii`, `check_anomaly`, `escalate_alert`.
- **Edge functions nuevas** (~15): `export-fhir-bundle`, `import-fhir-bundle`, `export-cda`, `import-catalogos`, `clinical-rules-engine`, `send-twilio-alert`, `predict-deterioration`, `tts-generate`, `stt-transcribe`, `translate-indigenous`, `simplify-medical-note`, `verify-tsa`, `admin-mfa-enroll`, `admin-mfa-verify`, `fhir-rest-router`.
- **Secrets necesarios**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`, `FREETSA_ENDPOINT` (público, opcional).
- **Frontend nuevo**: `/legal/*`, `/monitoreo`, `/admin/nom024`, `/admin/integridad`, `/security/report`, `/derechos-arco`, `<Cie10Combobox/>`, `<SignedFieldEditor/>`, `<AlertRealtimePanel/>`, `<A11ySettings/>`, `<MfaEnrollDialog/>`, `<OfflineBanner/>`.
- **Librerías**: `@medplum/core`, `@medplum/fhir-schemas`, `dexie` (IndexedDB offline), `otplib` (MFA), `pdf-lib` (firma PDF), `curp-validator`.

## Orden recomendado y estimación

1. Sprint 1 (legal) — 3-4 días — **desbloquea auditoría inmediata**
2. Sprint 2 (integridad) — 5-6 días — **requisito duro NOM-024**
3. Sprint 7 (seguridad) — 4-5 días — se puede paralelizar con Sprint 3
4. Sprint 3 (catálogos) — 5-7 días (depende de descarga oficial DGIS)
5. Sprint 4 (FHIR/CDA) — 5-6 días
6. Sprint 5 (monitoreo tiempo real) — 6-8 días — el gran diferenciador
7. Sprint 6 (accesibilidad) — 4-5 días
8. Sprint 8 (dashboards + certificación) — 3-4 días

Total: ~6-8 semanas de trabajo continuo.

## Consideraciones antes de aprobar

- **Catálogos oficiales**: CIE-10 y LOINC son descargas grandes; ¿los proporcionas tú o autorizas que use versiones open-source de GitHub (WHO/Regenstrief)?
- **Twilio**: requiere cuenta propia + costo por mensaje ($0.005 USD/SMS MX). ¿La activamos ya o queda opcional?
- **TSA (sellado de tiempo)**: freeTSA es gratis pero puede caerse; alternativa comercial ~$50 USD/año. ¿Cuál prefieres?
- **MFA obligatorio**: puede molestar a médicos mayores. ¿Lo hacemos opcional el primer mes y obligatorio después?

Apruébame el plan tal cual o dime qué ajustar y arranco Sprint 1 en cuanto pases a modo build.
