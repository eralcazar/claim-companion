## Landing pública en `/` para CareCentral

Reemplazar el `RootRedirect` actual por una landing pública en español. Usuarios autenticados que entren a `/` serán redirigidos a `/dashboard`; los demás verán la landing.

### Estructura de la landing (`src/pages/Landing.tsx`)

1. **Header sticky** — Logo `CareCentralLogo` + botones "Iniciar sesión" (→ `/login`) y "Conocer más" (scroll a sección features).
2. **Hero** — Titular "Tu salud, en un solo lugar", subtítulo, avatar de Kari (reusa `kari-avatar.png`), dos CTAs grandes:
   - **Iniciar sesión** → `/login` (variant primario)
   - **Conocer más** → scroll suave a `#features`
   Fondo con `gradient-hero` y blobs (mismo estilo que Login).
3. **Sección "¿Qué es CareCentral?"** (`#features`) — 3-4 cards con iconos lucide:
   - Expediente digital familiar
   - Recordatorios de medicamentos y citas
   - Reclamos médicos con OCR
   - Asistente IA Kari
4. **Sección "Para quién"** — Pacientes, Médicos, Brokers, Farmacias/Laboratorios (badges/cards).
5. **Sección "Cómo funciona"** — 3 pasos: Regístrate → Conecta tu información → Gestiona tu salud.
6. **CTA final** — "Comienza gratis con 5 OCR al mes" + botón "Iniciar sesión".
7. **Footer** — Links a `/legal#terminos`, `/legal#privacidad`, copyright.

### Cambios técnicos

- **Nuevo**: `src/pages/Landing.tsx` — landing pública, 100% en español, usa tokens del design system (Teal `#14B8A6`, Navy, Cyan), `glass-card`, animaciones `animate-fade-in`.
- **Modificado**: `src/App.tsx`
  - Reemplazar `RootRedirect` por `RootRoute`: si `loading` → spinner; si `user` → `<Navigate to="/dashboard" replace />`; si no → `<Landing />`.
  - Importar `Landing`.
- **SEO en `index.html`** (verificar y ajustar si falta):
  - `<title>` < 60 chars con keyword "CareCentral"
  - `<meta name="description">` < 160 chars
  - Un solo `<h1>` en la landing
  - `<link rel="canonical">`
  - JSON-LD tipo `Organization` / `SoftwareApplication`

### Detalles de diseño

- Mobile-first (bottom-up), responsivo en 1106px+.
- Reutilizar componentes shadcn `Button`, iconos de `lucide-react`.
- No reescribir tokens — usar los existentes en `index.css` y `tailwind.config.ts`.
- Avatar de Kari con burbuja de saludo (similar al Login pero más prominente en hero).

### Archivos a tocar

- `src/pages/Landing.tsx` (nuevo)
- `src/App.tsx` (reemplazar `RootRedirect` → `RootRoute`)
- `index.html` (metadatos SEO si faltan)
