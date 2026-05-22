## Nav mobile-first + secciones Pacientes y Brokers en la landing

Mejorar `src/pages/Landing.tsx` con una navegación mobile-first y dos secciones diferenciadas que expliquen qué hace CareCentral para cada audiencia clave.

### 1. Barra de navegación mobile-first

Reemplazar el header actual por uno responsive:

- **Mobile (<640px)**: logo a la izquierda + botón hamburguesa a la derecha. Al tocar, abre un `Sheet` (drawer lateral de shadcn) con:
  - Links: "Pacientes", "Brokers", "Cómo funciona"
  - CTA "Iniciar sesión" (primary, full-width)
- **Desktop (≥640px)**: logo + links horizontales ("Pacientes", "Brokers", "Cómo funciona") + botón "Iniciar sesión".
- Sticky, blur de fondo, scroll suave a anclas (`#pacientes`, `#brokers`, `#como-funciona`).

### 2. Sección "Para Pacientes" (`#pacientes`)

Layout 2 columnas en desktop, stack en mobile:

- **Izquierda**: titular "Tu salud y la de tu familia, organizadas", subtítulo, lista con iconos (check + lucide):
  - Expediente digital de toda la familia
  - Recordatorios de medicamentos y citas
  - Captura de recetas y estudios con OCR
  - Asistente Kari para resolver dudas
  - Indicadores: presión, glucosa, oxigenación, temperatura
  - CTA "Crear cuenta gratis" → `/login`
- **Derecha**: card visual con avatar Kari + mini mockup (cards apiladas con métricas de ejemplo usando tokens del design system).

### 3. Sección "Para Brokers" (`#brokers`)

Fondo `bg-muted/30` para contraste. Layout invertido (visual a la izquierda, texto a la derecha en desktop):

- **Texto**: titular "Gestiona a tus asegurados desde un solo panel", subtítulo, lista:
  - Asignación masiva de pacientes vía CSV
  - Visibilidad de pólizas y reclamos por cliente
  - Seguimiento del estado de cada reclamo
  - Notificaciones automáticas a tus clientes
  - CTA "Soy broker, quiero acceso" → `/login`
- **Visual**: card con tabla simulada de "Asegurados activos" (rows de ejemplo, badges de estado).

### 4. Reorganización del flujo

Nuevo orden de secciones:
1. Header sticky con nav
2. Hero (sin cambios)
3. **Pacientes** (nueva)
4. **Brokers** (nueva)
5. Features generales (mantener, renombrar título a "Todo en una sola app")
6. Cómo funciona (con id `#como-funciona`)
7. CTA final
8. Footer

Eliminar la sección "Para todo el ecosistema" (los badges de audiencias) porque ahora Pacientes y Brokers tienen secciones propias; mover Médicos / Laboratorios / Farmacias a una franja compacta dentro del footer o eliminar.

### Archivos a tocar

- `src/pages/Landing.tsx` — refactor del header (nav + Sheet mobile) y añadir secciones `#pacientes` y `#brokers`.

### Detalles técnicos

- Usar `Sheet`, `SheetTrigger`, `SheetContent` de `@/components/ui/sheet` para el drawer mobile.
- Icono hamburguesa: `Menu` de `lucide-react`.
- Tokens del design system: `text-primary`, `bg-primary/10`, `glass-card`, `gradient-hero` — sin colores hardcoded.
- Scroll suave con `scrollIntoView({ behavior: "smooth" })`, cerrando el Sheet al navegar.
- Mantener 100% en español.
