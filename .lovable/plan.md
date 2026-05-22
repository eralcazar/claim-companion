## Verificación de la landing `/` — resultados y ajustes propuestos

### ✅ Tokens de diseño
Inspección de `src/pages/Landing.tsx`:
- **0 colores hardcodeados** (sin hex `#...`, sin `rgb()`, sin `text-white`, `bg-black`, etc.).
- Todos los colores usan tokens semánticos: `text-primary`, `bg-primary/10`, `text-muted-foreground`, `bg-card`, `bg-background`, `border-border/...`, `bg-foreground`, `text-background`.
- 1 `style` inline en la sección Pacientes usa correctamente `var(--gradient-hero)` (token CSS).
- Clases utilitarias del proyecto: `glass-card`, `gradient-hero`, `animate-fade-in`.

**Conclusión**: la landing respeta la paleta CareCentral (Teal #14B8A6 primary, Navy fg, Cyan accent) vía tokens.

### ⚠️ Mobile (390×844) — no verificable en sesión actual
La sesión del preview está autenticada, por lo que `/` redirige a `/dashboard` y no permite ver la landing visualmente. La lógica de `RootRoute` es correcta: invitados ven `<Landing />`.

### Ajustes propuestos (mobile-first, sin tocar diseño general)

Para garantizar legibilidad y respiración en pantallas ≤390px:

1. **Hero**: reducir `text-4xl` → `text-3xl` en h1 mobile (cambiar a `text-3xl sm:text-4xl lg:text-6xl`). Reducir `py-14` → `py-10` en mobile.
2. **Avatar Kari**: en mobile la imagen mide `h-72 w-64`, ocupa demasiado. Bajar a `h-56 w-52 sm:h-80 sm:w-72`.
3. **CTAs hero**: ya son full-width en mobile via `flex-col`. Verificar que tengan `w-full sm:w-auto` para que llenen el ancho disponible.
4. **Pacientes / Brokers**: en mobile las cards mockup (resumen de salud, tabla asegurados) pueden desbordar — añadir `text-xs` en valores secundarios y `min-w-0` a los contenedores.
5. **Header**: el botón "Entrar" + hamburguesa en mobile están bien dimensionados; verificar `gap-2` no apriete el logo.
6. **Footer**: en mobile el `flex-col` ya stackea correctamente.
7. **Scroll anchors**: `scroll-mt-20` ya aplicado a `#pacientes`, `#brokers`, `#como-funciona` para compensar header sticky.

### Archivos a tocar

- `src/pages/Landing.tsx` — ajustes responsive puntuales (tamaños de tipografía, alturas de imagen, `w-full sm:w-auto` en CTAs hero, `min-w-0` en cards mockup).

No se requieren cambios en `index.css` ni `tailwind.config.ts`.
