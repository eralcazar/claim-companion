## Plan: Rebrand a CareCentral + Acceso universal a Planes y Paquetes OCR

Dos entregas en una sola implementación.

---

## PARTE A — Rebrand visual a CareCentral

### Tokens (`src/index.css`)
- Reemplazar paleta 4T por:
  - `--primary: 172 76% 40%` (#14B8A6) + `--primary-foreground: 0 0% 100%`
  - `--background: 210 40% 98%` (#F8FAFC), `--foreground: 222 47% 11%` (navy #0F172A)
  - `--accent: 187 85% 53%` (cyan #22D3EE)
  - `--success: 142 71% 45%` (#22C55E), `--warning: 38 92% 50%`, `--destructive: 0 84% 60%`
  - `--radius: 1rem` (16px)
  - `--sidebar` navy oscuro con acento teal
  - Variantes dark coherentes
- Reemplazar import de Sora+Manrope por **Inter** (400/500/600/700/800)

### Tipografía (`tailwind.config.ts`)
- `fontFamily.heading` y `fontFamily.body` ambos = `["Inter", "sans-serif"]`

### Branding
- **Crear** `src/components/brand/CareCentralLogo.tsx`:
  - Logo SVG: círculo gradient teal con cruz blanca + arco "mano" abrazando
  - Wordmark "Care" navy + "Central" teal
  - Tamaños sm/md/lg/xl
- **Crear** `src/assets/kari.png` (copiar la imagen subida al proyecto)
- `index.html`: título "CareCentral · Tu salud, conectada contigo"

### Login (`src/pages/Login.tsx`) — según preview aprobado
- Header: logo + wordmark + tagline "Tu salud, conectada contigo ♥"
- Hero: Kari de cuerpo completo a la izquierda + bloque derecho con "¡Bienvenido!" + 3 cards glass (Seguro/Rápido/Cercano)
- Card de login: solo botones Google + Apple (estilo blanco con sombra)
- Footer Términos + Política
- Decoraciones suaves (cruces y halos teal/cyan)

### Header (`src/components/AppLayout.tsx`)
- Reemplazar texto "Aplicación del Bienestar / 4T" por logo CareCentral compacto + "CareCentral"
- Tagline: "Tu salud, conectada contigo"

### Limpieza de identidad anterior
Reemplazar "Bienestar Ciudadano / 4T / Aplicación del Bienestar" por "CareCentral" en:
- `src/components/claims/forms/generateFormPDF.ts`
- `src/components/claims/generateClaimPDF.ts`
- `src/components/estudios/estudioPdf.ts`
- `src/pages/admin/AccessManager.tsx`

### Memoria
Actualizar `mem://index.md` y `mem://design/tokens`:
- App name: CareCentral
- Paleta: teal #14B8A6 + navy #0F2A4A + cyan #22D3EE
- Fuente: Inter
- Tagline: "Tu salud, conectada contigo"
- Eliminar refs a 4T / Bienestar / MediClaim

---

## PARTE B — Acceso universal a Planes y Paquetes OCR (Stripe)

### Diagnóstico
- ✅ Edge functions existen: `subscription-create-checkout`, `ocr-pack-checkout`, `payments-webhook`, `create-portal-session`
- ✅ Tablas: `subscription_plans`, `ocr_packs`, `subscriptions`, `ocr_quotas`
- ✅ Página `/planes` y `/suscripcion` ya programadas con embedded checkout
- ✅ Stripe sandbox configurado (`STRIPE_SANDBOX_API_KEY`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`)
- ✅ Paquetes OCR tienen `stripe_price_id` válido
- ❌ Único plan activo "PLAN INICIAL" NO tiene `stripe_price_id_mensual/anual` → no se puede cobrar
- ❌ `/planes` y `/suscripcion` **no aparecen** en `AppSidebar` ni `BottomNav` para pacientes
- ❌ No hay banner "Sin escaneos / Suscríbete" donde cuenta

### Cambios

**1. Crear productos/precios reales en Stripe** vía `payments--batch_create_product` (sandbox + auto-sync a live al publicar):
- `carecentral_basico` — Plan Básico — $99 MXN/mes y $990 MXN/año — 50 escaneos OCR/mes
- `carecentral_pro` — Plan Pro — $199 MXN/mes y $1990 MXN/año — 200 escaneos OCR/mes
- `carecentral_familiar` — Plan Familiar — $349 MXN/mes y $3490 MXN/año — 500 escaneos OCR/mes

**2. Migración**: Insertar/actualizar `subscription_plans` con esos `stripe_price_id_mensual` / `stripe_price_id_anual` y `ocr_pages_per_month`. Marcar el actual "PLAN INICIAL" como `activo=false`.

**3. Navegación accesible para todos los usuarios**:
- `AppSidebar`: agregar items "Planes" (`/planes`, icono `Sparkles`) y "Mi suscripción" (`/suscripcion`, icono `CreditCard`) bajo `mainItems` (visibles para paciente/broker/médico)
- `BottomNav` (mobile): reemplazar uno de los tabs existentes por "Planes" o agregar un menú "Más" — propuesta concreta: añadir item "Planes" (5 → 6 tabs no cabe bien, así que reemplazo "Reclamos" por dropdown o muevo "Reclamos" al sidebar largo). Decisión: **dejar BottomNav como está** y exponer Planes/Suscripción solo en sidebar desktop + en menú de perfil mobile (link nuevo en `Profile.tsx`)

**4. UX de upsell**:
- En `Estudios` (cuando intenten OCR sin créditos): mostrar banner "Sin escaneos disponibles → Comprar paquete" con link directo a `/planes#paquetes`
- En `Profile.tsx`: tarjeta resumen con plan actual + saldo OCR + botones "Ver planes" y "Mi suscripción"

**5. Verificar edge functions** (`supabase--curl_edge_functions` con auth real) que `subscription-create-checkout` y `ocr-pack-checkout` devuelvan `clientSecret` correctamente con los nuevos `price_id`.

**6. Banner de modo prueba** (`PaymentTestModeBanner` ya existe en el repo) — verificar que se monta en `AppLayout` para que en preview se vea claramente que son pagos sandbox.

### Fuera de alcance
- Stripe LIVE (se activa al publicar, requiere verificación de cuenta)
- Personalización de portal Stripe (logo, colores) — se hace en dashboard Stripe
- Cambios en lógica de roles, RLS o BD más allá del seed de planes

¿Apruebas para implementar todo?