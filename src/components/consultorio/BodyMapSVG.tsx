import { useState } from "react";
import { cn } from "@/lib/utils";

interface Region {
  key: string;
  d: string;
}

/**
 * Silueta humana anatómica. viewBox 220 x 500.
 * Eje vertical: cabeza 8-90, cuello 82-105, hombros 105-125,
 * torso 105-220, cintura 215, caderas 235-260, muslos 260-350,
 * rodillas 350-365, pantorrillas 365-470, pies 470-498.
 */

/** Partes de la silueta como shapes separadas con el mismo fill */
const FRONT_SHAPES: { tag: "ellipse" | "path" | "rect"; attrs: Record<string, string | number> }[] = [
  // Cabeza
  { tag: "ellipse", attrs: { cx: 110, cy: 48, rx: 28, ry: 36 } },
  // Cuello
  { tag: "path", attrs: { d: "M96 78 Q96 96 92 108 L128 108 Q124 96 124 78 Z" } },
  // Torso (hombros → cintura → caderas)
  { tag: "path", attrs: { d: "M62 108 Q56 110 50 116 Q44 124 46 142 L60 175 Q60 195 58 215 Q60 232 64 248 Q60 260 64 272 L156 272 Q160 260 156 248 Q160 232 162 215 Q160 195 160 175 L174 142 Q176 124 170 116 Q164 110 158 108 Q142 106 110 106 Q78 106 62 108 Z" } },
  // Brazo izq paciente (derecha en pantalla)
  { tag: "path", attrs: { d: "M174 142 Q186 150 192 168 L196 220 Q198 250 196 278 Q192 296 184 308 Q176 304 174 290 Q170 264 168 232 Q166 200 162 175 Z" } },
  // Mano izq paciente
  { tag: "path", attrs: { d: "M184 308 Q196 316 198 332 Q198 344 192 350 Q184 348 178 340 Q174 326 176 314 Z" } },
  // Brazo der paciente (izquierda en pantalla)
  { tag: "path", attrs: { d: "M46 142 Q34 150 28 168 L24 220 Q22 250 24 278 Q28 296 36 308 Q44 304 46 290 Q50 264 52 232 Q54 200 58 175 Z" } },
  // Mano der paciente
  { tag: "path", attrs: { d: "M36 308 Q24 316 22 332 Q22 344 28 350 Q36 348 42 340 Q46 326 44 314 Z" } },
  // Muslo izq paciente (solapa con pelvis y pierna)
  { tag: "path", attrs: { d: "M110 264 Q140 264 158 268 Q162 300 158 332 Q156 360 148 378 Q138 378 130 368 Q118 340 110 310 Z" } },
  // Pierna izq paciente (solapa con muslo y pie)
  { tag: "path", attrs: { d: "M130 368 Q150 380 152 410 Q152 442 146 470 Q140 482 128 482 Q120 468 118 444 Q120 414 124 388 Z" } },
  // Pie izq paciente
  { tag: "path", attrs: { d: "M128 476 Q148 482 154 496 L154 504 L118 504 Q114 490 118 478 Z" } },
  // Muslo der paciente
  { tag: "path", attrs: { d: "M110 264 Q80 264 62 268 Q58 300 62 332 Q64 360 72 378 Q82 378 90 368 Q102 340 110 310 Z" } },
  // Pierna der paciente
  { tag: "path", attrs: { d: "M90 368 Q70 380 68 410 Q68 442 74 470 Q80 482 92 482 Q100 468 102 444 Q100 414 96 388 Z" } },
  // Pie der paciente
  { tag: "path", attrs: { d: "M92 476 Q72 482 66 496 L66 504 L102 504 Q106 490 102 478 Z" } },
];

/** Detalles anatómicos decorativos (frontales) */
const FRONT_DETAILS = [
  "M84 116 Q110 126 136 116", // clavículas
  "M110 130 L110 200", // esternón
  "M82 142 Q110 158 138 142", // pectoral
  "M110 220 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", // ombligo (círculo)
  "M76 256 Q110 272 144 256", // inguinal
  "M82 358 Q88 366 94 358", // rótula der
  "M126 358 Q132 366 138 358", // rótula izq
];

/** Detalles anatómicos posteriores */
const BACK_DETAILS = [
  "M110 116 L110 250", // columna
  "M82 134 Q96 124 108 134 Q104 152 90 150 Z", // escápula der
  "M138 134 Q124 124 112 134 Q116 152 130 150 Z", // escápula izq
  "M76 260 Q110 268 144 260", // pliegue glúteo
  "M82 358 Q88 364 94 358",
  "M126 358 Q132 364 138 358",
];

/** Regiones interactivas frontales — siguen contorno orgánico */
const FRONT_REGIONS: Region[] = [
  { key: "cabeza", d: "M82 48 a28 36 0 1 1 56 0 a28 36 0 1 1 -56 0 Z" },
  { key: "cuello", d: "M92 78 H128 V108 H92 Z" },
  { key: "torso", d: "M50 116 Q44 124 46 142 L60 175 H160 L174 142 Q176 124 170 116 Q164 110 158 108 Q110 106 62 108 Q56 110 50 116 Z" },
  { key: "abdomen", d: "M60 175 Q60 200 58 220 H162 Q160 200 160 175 Z" },
  { key: "pelvis", d: "M58 220 Q60 240 64 272 H156 Q160 240 162 220 Z" },
  { key: "brazo-der", d: "M46 142 Q34 150 28 168 L24 220 L52 232 Q54 200 58 175 Z" },
  { key: "antebrazo-der", d: "M24 220 Q22 250 24 278 Q28 296 36 308 L52 290 Q54 260 52 232 Z" },
  { key: "mano-der", d: "M36 308 Q24 316 22 332 Q22 344 28 350 Q36 348 42 340 Q46 326 44 314 Z" },
  { key: "brazo-izq", d: "M174 142 Q186 150 192 168 L196 220 L168 232 Q166 200 162 175 Z" },
  { key: "antebrazo-izq", d: "M196 220 Q198 250 196 278 Q192 296 184 308 L168 290 Q166 260 168 232 Z" },
  { key: "mano-izq", d: "M184 308 Q196 316 198 332 Q198 344 192 350 Q184 348 178 340 Q174 326 176 314 Z" },
  { key: "muslo-der", d: "M64 272 Q60 300 62 330 Q64 358 72 372 L110 372 L110 272 Z" },
  { key: "pierna-der", d: "M72 372 Q72 384 70 410 Q70 440 76 466 L100 466 L102 444 Q100 414 96 388 L92 372 Z" },
  { key: "pie-der", d: "M76 466 Q74 480 68 494 L68 502 L100 502 L102 480 Z" },
  { key: "muslo-izq", d: "M156 272 Q160 300 158 330 Q156 358 148 372 L110 372 L110 272 Z" },
  { key: "pierna-izq", d: "M148 372 Q148 384 150 410 Q150 440 144 466 L120 466 L118 444 Q120 414 124 388 L128 372 Z" },
  { key: "pie-izq", d: "M144 466 Q146 480 152 494 L152 502 L120 502 L118 480 Z" },
];

/** Regiones interactivas posteriores */
const BACK_REGIONS: Region[] = [
  { key: "cabeza", d: "M82 48 a28 36 0 1 1 56 0 a28 36 0 1 1 -56 0 Z" },
  { key: "cuello", d: "M92 78 H128 V108 H92 Z" },
  { key: "espalda-superior", d: "M50 116 Q44 124 46 142 L60 175 H160 L174 142 Q176 124 170 116 Q110 106 50 116 Z" },
  { key: "espalda-inferior", d: "M60 175 Q60 200 58 220 H162 Q160 200 160 175 Z" },
  { key: "gluteos", d: "M58 220 Q60 240 64 272 H156 Q160 240 162 220 Z" },
  { key: "brazo-der", d: "M46 142 Q34 150 28 168 L24 220 L52 232 Q54 200 58 175 Z" },
  { key: "antebrazo-der", d: "M24 220 Q22 250 24 278 Q28 296 36 308 L52 290 Q54 260 52 232 Z" },
  { key: "mano-der", d: "M36 308 Q24 316 22 332 Q22 344 28 350 Q36 348 42 340 Q46 326 44 314 Z" },
  { key: "brazo-izq", d: "M174 142 Q186 150 192 168 L196 220 L168 232 Q166 200 162 175 Z" },
  { key: "antebrazo-izq", d: "M196 220 Q198 250 196 278 Q192 296 184 308 L168 290 Q166 260 168 232 Z" },
  { key: "mano-izq", d: "M184 308 Q196 316 198 332 Q198 344 192 350 Q184 348 178 340 Q174 326 176 314 Z" },
  { key: "muslo-der", d: "M64 272 Q60 300 62 330 Q64 358 72 372 L110 372 L110 272 Z" },
  { key: "pierna-der", d: "M72 372 Q72 384 70 410 Q70 440 76 466 L100 466 L102 444 Q100 414 96 388 L92 372 Z" },
  { key: "pie-der", d: "M76 466 Q74 480 68 494 L68 502 L100 502 L102 480 Z" },
  { key: "muslo-izq", d: "M156 272 Q160 300 158 330 Q156 358 148 372 L110 372 L110 272 Z" },
  { key: "pierna-izq", d: "M148 372 Q148 384 150 410 Q150 440 144 466 L120 466 L118 444 Q120 414 124 388 L128 372 Z" },
  { key: "pie-izq", d: "M144 466 Q146 480 152 494 L152 502 L120 502 L118 480 Z" },
];

const SEVERITY_COLOR: Record<string, string> = {
  leve: "hsl(var(--primary))",
  moderada: "hsl(38 92% 50%)",
  grave: "hsl(var(--destructive))",
};

export interface BodyMarker {
  id: string;
  body_part: string;
  marker_x: number;
  marker_y: number;
  severity: "leve" | "moderada" | "grave";
}

interface Props {
  view: "frontal" | "posterior";
  markers: BodyMarker[];
  onPick?: (info: { body_part: string; marker_x: number; marker_y: number }) => void;
  onMarkerClick?: (id: string) => void;
  readOnly?: boolean;
}

export function BodyMapSVG({ view, markers, onPick, onMarkerClick, readOnly }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const regions = view === "frontal" ? FRONT_REGIONS : BACK_REGIONS;
  const details = view === "frontal" ? FRONT_DETAILS : BACK_DETAILS;

  return (
    <svg
      viewBox="0 0 220 510"
      className="w-full max-w-[220px] max-h-[500px] mx-auto select-none"
      style={{ touchAction: "manipulation" }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Sombra */}
      <ellipse
        cx="110"
        cy="506"
        rx="62"
        ry="4"
        fill="hsl(var(--muted-foreground) / 0.12)"
        className="pointer-events-none"
      />

      {/* Silueta de fondo (todas las shapes fusionadas visualmente) */}
      <g
        fill="hsl(var(--muted))"
        stroke="hsl(var(--border))"
        strokeWidth="0.7"
        strokeLinejoin="round"
        className="pointer-events-none"
      >
        {FRONT_SHAPES.map((s, i) => {
          if (s.tag === "ellipse") return <ellipse key={i} {...(s.attrs as any)} />;
          if (s.tag === "rect") return <rect key={i} {...(s.attrs as any)} />;
          return <path key={i} {...(s.attrs as any)} />;
        })}
      </g>

      {/* Detalles anatómicos decorativos */}
      <g
        fill="none"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.35"
        className="pointer-events-none"
      >
        {details.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* Marcadores de orientación lateral */}
      <g
        className="pointer-events-none"
        fill="hsl(var(--muted-foreground))"
        fontSize="9"
        fontFamily="ui-sans-serif, system-ui"
        opacity="0.4"
      >
        <text x="4" y="14">{view === "frontal" ? "D" : "I"}</text>
        <text x="208" y="14" textAnchor="end">{view === "frontal" ? "I" : "D"}</text>
      </g>

      {/* Regiones interactivas */}
      {!readOnly && (
        <g>
          {regions.map((r) => (
            <path
              key={r.key}
              d={r.d}
              fill={hover === r.key ? "hsl(var(--primary) / 0.28)" : "transparent"}
              stroke={hover === r.key ? "hsl(var(--primary))" : "transparent"}
              strokeWidth="1"
              className={cn("cursor-pointer transition-colors duration-150")}
              onMouseEnter={() => setHover(r.key)}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                const svg = e.currentTarget.ownerSVGElement!;
                const pt = svg.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const ctm = svg.getScreenCTM();
                if (!ctm) return;
                const local = pt.matrixTransform(ctm.inverse());
                const xPct = (local.x / 220) * 100;
                const yPct = (local.y / 510) * 100;
                onPick?.({ body_part: r.key, marker_x: xPct, marker_y: yPct });
              }}
            />
          ))}
        </g>
      )}

      {/* Marcadores */}
      {markers.map((m) => {
        const cx = (m.marker_x / 100) * 220;
        const cy = (m.marker_y / 100) * 510;
        const color = SEVERITY_COLOR[m.severity];
        return (
          <g
            key={m.id}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onMarkerClick?.(m.id);
            }}
          >
            <circle cx={cx} cy={cy} r="10" fill={color} opacity="0.22" />
            <circle cx={cx} cy={cy} r="5.5" fill={color} stroke="hsl(var(--background))" strokeWidth="1.5" />
          </g>
        );
      })}
    </svg>
  );
}