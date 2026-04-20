

## Contexto

En el editor visual actual (`/admin/gestor-archivos` → tab **Editor visual**) solo hay:
- **Nuevo campo**: dibujas una caja a mano sobre el PDF.
- Mover/redimensionar/eliminar las existentes.

**No existe** botón de detección automática. Eso quedó marcado como "no incluido" en la pieza 3. Ahora lo añadimos.

## Objetivo

Botón **"Detectar campos automáticamente"** en la barra del Editor visual que analiza la página actual del PDF y propone cajas (campos + sus etiquetas) usando IA. Las propuestas se muestran como overlays "fantasma" amarillos; el admin acepta/descarta cada una o "Aceptar todas".

## UX

```text
[◀] 1/3 [▶]   Zoom ──●── 100%   [+ Nuevo campo]   [✨ Detectar campos]
                                                       │
                                                       ▼ (al click)
                            ┌──────────────────────────────────────┐
                            │ Detectando campos página 1...        │
                            │ ████████░░░░ 60%                     │
                            └──────────────────────────────────────┘

Tras detectar:
┌─ PDF página 1 ──────────────────┐  ┌─ Propuestas (12) ────────────┐
│  ┌────┐ ← amarillo punteado     │  │ ☑ NOMBRE_PACIENTE  [editar]  │
│  │NOMB│   (propuesta)           │  │ ☑ CURP            [editar]  │
│  └────┘                          │  │ ☐ FECHA_NAC       [editar]  │
│  ┌────────┐                     │  │ ☑ DIRECCION       [editar]  │
│  │CURP____│                     │  │ ...                          │
│  └────────┘                     │  │                              │
│                                  │  │ [Aceptar 9]  [Descartar]    │
└──────────────────────────────────┘  └──────────────────────────────┘
```

- Cajas amarillas punteadas = propuestas aún no guardadas.
- Cajas azules sólidas = campos ya persistidos (sin cambios).
- Click sobre una propuesta la selecciona y permite editar clave/etiqueta antes de aceptar.

## Cómo detecta (pipeline)

1. **Cliente** renderiza la página actual del PDF a PNG con `pdf.js` (canvas → `toDataURL`).
2. POST a edge function `detect-form-fields` con `{ image_base64, page_number, formulario_nombre }`.
3. **Edge function** llama a Lovable AI Gateway con `google/gemini-2.5-pro` (multimodal, fuerte en visión + razonamiento). Prompt pide devolver JSON con array de:
   ```json
   { "clave": "NOMBRE_PACIENTE", "etiqueta": "Nombre del paciente",
     "tipo": "texto", "x": 12.5, "y": 18.2, "w": 35.0, "h": 3.5 }
   ```
   Coordenadas en % del page rect (lo mismo que ya usamos).
4. Edge devuelve `{ propuestas: [...] }` al cliente.
5. Cliente muestra como overlays amarillos en el `PDFCanvasEditor`.
6. Al **Aceptar**, hace `insert` batch en `campos` con `origen = 'auto_ia'`.

## Dónde encaja en el código

- **Botón** en la toolbar de `VisualEditor.tsx` (al lado de "Nuevo campo").
- **Estado nuevo** en `VisualEditor`: `proposals: ProposedField[]`, `detecting: boolean`.
- **`PDFCanvasEditor`** recibe nueva prop `proposals` y las pinta con `<ProposalBox>` (variante amarilla punteada de `FieldBox`, no editable, click = seleccionar).
- **Panel lateral derecho** muestra lista de propuestas con checkboxes y botones cuando `proposals.length > 0`; oculta el detalle del campo seleccionado mientras esté en modo revisión.
- **Edge function** `detect-form-fields` nueva, usa `LOVABLE_API_KEY` ya disponible en Cloud (sin secret nuevo).

## Esquema BD

Sin cambios. Reutiliza tabla `campos`. Solo se rellena `origen = 'auto_ia'` para distinguirlas en reportes futuros.

## Archivos

```text
crea:  supabase/functions/detect-form-fields/index.ts   (edge function: imagen → Gemini → JSON propuestas)
crea:  src/components/admin/ProposalBox.tsx              (overlay amarillo punteado, no draggable)
crea:  src/components/admin/ProposalsPanel.tsx           (lista propuestas con accept/discard)
edita: src/components/admin/VisualEditor.tsx             (botón "Detectar", estado, render proposals)
edita: src/components/admin/PDFCanvasEditor.tsx          (acepta prop `proposals` y las pinta)
edita: supabase/config.toml                              (verify_jwt=false para la nueva función pública admin)
```

## Detalles técnicos

- **Render de página a imagen**: usar `page.getViewport({ scale: 2 })` + canvas + `canvas.toDataURL("image/png")`. Escala 2 para que Gemini vea texto pequeño con calidad.
- **Modelo**: `google/gemini-2.5-pro` (mejor para visión + razonamiento estructurado). Fallback a `gemini-2.5-flash` si timeout.
- **Prompt** estricto con `response_format: { type: "json_object" }` + few-shot de 1-2 ejemplos de formularios médicos en español.
- **Validación**: cliente filtra propuestas con coordenadas inválidas (fuera de 0–100, w/h < 0.5%) o clave duplicada con campos existentes.
- **Costos**: ~1 llamada por página por click. Usuario consciente porque debe pulsar el botón.

## Lo que NO incluye

- Detección por OCR puro / Tesseract local (Gemini ya hace OCR + estructura mejor).
- Detección automática de **mapeos** (perfil/poliza/siniestro) — eso es otra pasada de IA, lo dejamos para iteración siguiente.
- Detección de cajas de **etiqueta** (`label_x/y/...`).
- Auto-detección al abrir el PDF (sería caro y no deseado); siempre bajo demanda.

