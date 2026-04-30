## Plan: Rediseño del Login con nuevo logo y composición de Kari

### Preview ASCII de la composición propuesta

```
┌─────────────────────────────────────────────────────────────┐
│  [LOGO 3D CareCentral]   "Tu salud, conectada contigo"      │
│                                                              │
│  ┌──────────────────────┐    ┌────────────────────────────┐ │
│  │                      │    │   Bienvenido               │ │
│  │   ╭───────────╮      │    │   Inicia sesión            │ │
│  │   │ ¡Hola!    │◀──── │    │                            │ │
│  │   │ Soy Kari 👋│ ⬤   │    │   [G] Continuar Google     │ │
│  │   ╰───────────╯ /│\  │    │   [] Continuar Apple      │ │
│  │                 / │ \ │    │                            │ │
│  │  ════════════════════│    │   Términos · Privacidad    │ │
│  │   Tu salud, en un   │    └────────────────────────────┘ │
│  │   solo lugar        │     ⭐ 5 escaneos OCR gratis       │
│  │  [piernas como      │                                    │
│  │   silueta de fondo, │                                    │
│  │   blur + opacity]   │                                    │
│  └──────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

### Cambios

**1. Nuevo logo CareCentral (3D adjunto)**
- Copiar `user-uploads://image-17.png` recortado a `src/assets/carecentral-logo-3d.png` (solo el logo + wordmark, sin el badge "05" ni la tagline duplicada — usaré el PNG completo y lo posicionaré para mostrar solo logo+nombre).
- Actualizar `src/components/brand/CareCentralLogo.tsx`: reemplazar el SVG actual por `<img>` del PNG 3D. Mantener props `size` y `withText` (cuando `withText=false` recorto solo el ícono; cuando `withText=true` muestro logo+wordmark integrado del PNG).

**2. Recomposición del hero de Kari (`src/pages/Login.tsx`)**
Estructura en capas (z-index) dentro de la columna izquierda:
- **Capa 0 (fondo)**: silueta de las piernas de Kari — misma imagen `kari-avatar.png` posicionada absolute, alineada al bottom, con `opacity: 0.15`, `filter: blur(8px)`, escala mayor. Solo se ve la mitad inferior.
- **Capa 1 (tipografía)**: el bloque de texto "Tu salud, en un solo lugar" + descripción + 3 cards glass se mueve hacia arriba para que su borde superior quede aproximadamente a la altura de la cintura de Kari (ocupa el espacio que antes estaba vacío debajo del avatar).
- **Capa 2 (Kari recortada)**: `kari-avatar.png` con `clip-path: inset(0 0 45% 0)` o usando un wrapper con `overflow:hidden` + `mask-image: linear-gradient(to bottom, black 55%, transparent 100%)` para que se desvanezca hacia abajo a la altura de la cintura.
- **Capa 3 (burbuja de chat)**: el badge "¡Hola! Soy Kari 👋" se reposiciona como burbuja de conversación (`rounded-2xl` con cola triangular vía pseudo-element) flotando a la derecha de la cabeza de Kari (`absolute top-[10%] right-[5%]` aprox), no debajo de ella.

**3. Header del Login**
- Reemplazar el `<CareCentralLogo size={48} withText />` actual por el nuevo logo 3D más prominente (≈ 56px) seguido del tagline en una línea: "Tu salud, conectada contigo".

### Detalles técnicos

- Archivos editados:
  - `src/components/brand/CareCentralLogo.tsx` — usa `<img src={logoPng}>` en lugar de SVG inline.
  - `src/pages/Login.tsx` — nueva estructura de capas en la columna izquierda con `relative`/`absolute` positioning, mask-image en CSS para fundido de Kari, y burbuja con cola.
- Archivo creado:
  - `src/assets/carecentral-logo-3d.png` — copia del upload.
- Sin cambios en BD, rutas, auth ni edge functions.

### Confirmación
Después de aplicar, tomaré un `browser--screenshot` de `/login` para verificar que la composición coincide con el ASCII de arriba antes de cerrar la tarea.
