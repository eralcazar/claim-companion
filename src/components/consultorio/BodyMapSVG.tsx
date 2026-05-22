import { useState } from "react";
import { cn } from "@/lib/utils";

interface Region {
  key: string;
  d: string;
}

/**
 * Silueta anatómica frontal. viewBox 220 x 520.
 * Cabeza ~y50, hombros ~y110, cintura ~y210, caderas ~y245,
 * rodillas ~y360, tobillos ~y480.
 */
const FRONT_SILHOUETTE =
  "M110 14 C128 14 142 30 142 50 C142 64 136 75 128 81 C133 84 138 88 142 94 L150 108 " +
  "C170 112 184 120 192 130 C198 138 196 150 188 158 L168 178 L162 210 " +
  "C162 220 160 228 156 236 L168 250 C170 280 168 320 162 358 " +
  "C158 388 152 420 148 460 C146 478 144 494 142 508 L122 508 " +
  "C122 494 122 478 120 460 C118 420 116 388 114 358 L110 320 L106 358 " +
  "C104 388 102 420 100 460 C98 478 98 494 98 508 L78 508 " +
  "C76 494 74 478 72 460 C68 420 62 388 58 358 C52 320 50 280 52 250 " +
  "L64 236 C60 228 58 220 58 210 L52 178 L32 158 C24 150 22 138 28 130 " +
  "C36 120 50 112 70 108 L78 94 C82 88 87 84 92 81 C84 75 78 64 78 50 " +
  "C78 30 92 14 110 14 Z";

const BACK_SILHOUETTE = FRONT_SILHOUETTE; // misma silueta exterior

/** Detalles decorativos NO interactivos */
const FRONT_DETAILS = [
  // clavículas
  "M86 108 Q110 116 134 108",
  // esternón
  "M110 118 L110 168",
  // línea pectoral
  "M88 128 Q110 142 132 128",
  // ombligo (punto)
  // línea inguinal
  "M82 248 Q110 262 138 248",
  // rótulas
  "M86 360 Q92 366 98 360",
  "M122 360 Q128 366 134 360",
];

const BACK_DETAILS = [
  // escápulas
  "M82 130 Q92 122 102 130 Q100 144 88 144 Z",
  "M138 130 Q128 122 118 130 Q120 144 132 144 Z",
  // columna
  "M110 112 L110 240",
  // glúteos
  "M110 252 L110 290",
  // fosas poplíteas
  "M86 358 Q92 364 98 358",
  "M122 358 Q128 364 134 358",
];

/** Regiones interactivas frontales (siguen el contorno orgánico) */
const FRONT_REGIONS: Region[] = [
  { key: "cabeza", d: "M110 14 C128 14 142 30 142 50 C142 70 128 86 110 86 C92 86 78 70 78 50 C78 30 92 14 110 14 Z" },
  { key: "cuello", d: "M92 82 H128 V100 H92 Z" },
  // torso (hombros a cintura)
  { key: "torso", d: "M70 108 C50 112 36 120 28 130 L52 178 L58 210 H162 L168 178 L192 130 C184 120 170 112 150 108 Z" },
  { key: "abdomen", d: "M58 210 C58 220 60 228 64 236 H156 C160 228 162 220 162 210 Z" },
  { key: "pelvis", d: "M64 236 L52 250 C52 260 54 268 56 276 H164 C166 268 168 260 168 250 L156 236 Z" },
  // brazo derecho (lado izquierdo en pantalla = derecho del paciente)
  { key: "brazo-der", d: "M28 130 C22 138 18 152 16 170 L24 200 L36 200 L52 178 Z" },
  { key: "antebrazo-der", d: "M16 170 C14 188 12 208 8 232 L22 252 L36 232 L24 200 Z" },
  { key: "mano-der", d: "M8 232 C4 242 2 254 4 266 L20 270 L26 256 L22 252 Z" },
  // brazo izquierdo
  { key: "brazo-izq", d: "M192 130 C198 138 202 152 204 170 L196 200 L184 200 L168 178 Z" },
  { key: "antebrazo-izq", d: "M204 170 C206 188 208 208 212 232 L198 252 L184 232 L196 200 Z" },
  { key: "mano-izq", d: "M212 232 C216 242 218 254 216 266 L200 270 L194 256 L198 252 Z" },
  // piernas (lado paciente)
  { key: "muslo-der", d: "M56 276 C54 308 56 336 60 358 L82 358 L110 320 L110 276 Z" },
  { key: "pierna-der", d: "M60 358 C58 396 64 432 72 470 L96 470 L106 432 L98 396 L82 358 Z" },
  { key: "pie-der", d: "M72 470 C70 484 72 498 78 508 H100 L102 488 L96 470 Z" },
  { key: "muslo-izq", d: "M164 276 C166 308 164 336 160 358 L138 358 L110 320 L110 276 Z" },
  { key: "pierna-izq", d: "M160 358 C162 396 156 432 148 470 L124 470 L114 432 L122 396 L138 358 Z" },
  { key: "pie-izq", d: "M148 470 C150 484 148 498 142 508 H120 L118 488 L124 470 Z" },
];

/** Regiones interactivas posteriores */
const BACK_REGIONS: Region[] = [
  { key: "cabeza", d: "M110 14 C128 14 142 30 142 50 C142 70 128 86 110 86 C92 86 78 70 78 50 C78 30 92 14 110 14 Z" },
  { key: "cuello", d: "M92 82 H128 V100 H92 Z" },
  { key: "espalda-superior", d: "M70 108 C50 112 36 120 28 130 L52 178 H168 L192 130 C184 120 170 112 150 108 Z" },
  { key: "espalda-inferior", d: "M52 178 L58 210 C58 220 60 228 64 236 H156 C160 228 162 220 162 210 L168 178 Z" },
  { key: "gluteos", d: "M64 236 L52 250 C52 264 54 276 58 290 H162 C166 276 168 264 168 250 L156 236 Z" },
  { key: "brazo-der", d: "M28 130 C22 138 18 152 16 170 L24 200 L36 200 L52 178 Z" },
  { key: "antebrazo-der", d: "M16 170 C14 188 12 208 8 232 L22 252 L36 232 L24 200 Z" },
  { key: "mano-der", d: "M8 232 C4 242 2 254 4 266 L20 270 L26 256 L22 252 Z" },
  { key: "brazo-izq", d: "M192 130 C198 138 202 152 204 170 L196 200 L184 200 L168 178 Z" },
  { key: "antebrazo-izq", d: "M204 170 C206 188 208 208 212 232 L198 252 L184 232 L196 200 Z" },
  { key: "mano-izq", d: "M212 232 C216 242 218 254 216 266 L200 270 L194 256 L198 252 Z" },
  { key: "muslo-der", d: "M58 290 C56 322 58 344 62 366 L84 366 L110 326 L110 290 Z" },
  { key: "pierna-der", d: "M62 366 C60 402 66 436 74 472 L96 472 L106 434 L98 398 L84 366 Z" },
  { key: "pie-der", d: "M74 472 C72 486 74 500 80 510 H102 L104 490 L96 472 Z" },
  { key: "muslo-izq", d: "M162 290 C164 322 162 344 158 366 L136 366 L110 326 L110 290 Z" },
  { key: "pierna-izq", d: "M158 366 C160 402 154 436 146 472 L124 472 L114 434 L122 398 L136 366 Z" },
  { key: "pie-izq", d: "M146 472 C148 486 146 500 140 510 H118 L116 490 L124 472 Z" },
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
  const silhouette = view === "frontal" ? FRONT_SILHOUETTE : BACK_SILHOUETTE;
  const details = view === "frontal" ? FRONT_DETAILS : BACK_DETAILS;

  return (
    <svg
      viewBox="0 0 220 520"
      className="w-full max-w-[300px] mx-auto select-none"
      style={{ touchAction: "manipulation" }}
    >
      {/* Sombra */}
      <ellipse
        cx="110"
        cy="514"
        rx="60"
        ry="4"
        fill="hsl(var(--muted-foreground) / 0.12)"
        className="pointer-events-none"
      />

      {/* Silueta de fondo */}
      <path
        d={silhouette}
        fill="hsl(var(--muted))"
        stroke="hsl(var(--border))"
        strokeWidth="0.8"
        strokeLinejoin="round"
        className="pointer-events-none"
      />

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
        {view === "frontal" && (
          <circle cx="110" cy="218" r="1.2" fill="hsl(var(--muted-foreground))" />
        )}
      </g>

      {/* Marcadores de orientación lateral */}
      <g
        className="pointer-events-none"
        fill="hsl(var(--muted-foreground))"
        fontSize="9"
        fontFamily="ui-sans-serif, system-ui"
        opacity="0.35"
      >
        <text x="6" y="14">{view === "frontal" ? "D" : "I"}</text>
        <text x="208" y="14">{view === "frontal" ? "I" : "D"}</text>
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
                const yPct = (local.y / 520) * 100;
                onPick?.({ body_part: r.key, marker_x: xPct, marker_y: yPct });
              }}
            />
          ))}
        </g>
      )}

      {/* Marcadores con halo */}
      {markers.map((m) => {
        const cx = (m.marker_x / 100) * 220;
        const cy = (m.marker_y / 100) * 520;
        const color = SEVERITY_COLOR[m.severity];
        return (
          <g key={m.id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onMarkerClick?.(m.id); }}>
            <circle cx={cx} cy={cy} r="10" fill={color} opacity="0.22" />
            <circle cx={cx} cy={cy} r="5.5" fill={color} stroke="hsl(var(--background))" strokeWidth="1.5" />
          </g>
        );
      })}
    </svg>
  );
}