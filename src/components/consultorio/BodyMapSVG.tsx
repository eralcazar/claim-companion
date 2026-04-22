import { useState } from "react";
import { cn } from "@/lib/utils";

interface Region {
  key: string;
  d: string;
}

const FRONT_REGIONS: Region[] = [
  { key: "cabeza", d: "M100 25 a25 25 0 1 1 0.1 0 z" },
  { key: "cuello", d: "M88 50 h24 v15 h-24 z" },
  { key: "torso", d: "M70 65 h60 v55 h-60 z" },
  { key: "abdomen", d: "M75 120 h50 v25 h-50 z" },
  { key: "pelvis", d: "M75 145 h50 v20 h-50 z" },
  { key: "brazo-der", d: "M55 70 h15 v55 h-15 z" },
  { key: "brazo-izq", d: "M130 70 h15 v55 h-15 z" },
  { key: "antebrazo-der", d: "M55 125 h15 v50 h-15 z" },
  { key: "antebrazo-izq", d: "M130 125 h15 v50 h-15 z" },
  { key: "mano-der", d: "M52 175 h21 v18 h-21 z" },
  { key: "mano-izq", d: "M127 175 h21 v18 h-21 z" },
  { key: "muslo-der", d: "M76 165 h22 v55 h-22 z" },
  { key: "muslo-izq", d: "M102 165 h22 v55 h-22 z" },
  { key: "pierna-der", d: "M78 220 h20 v50 h-20 z" },
  { key: "pierna-izq", d: "M102 220 h20 v50 h-20 z" },
  { key: "pie-der", d: "M75 270 h25 v15 h-25 z" },
  { key: "pie-izq", d: "M100 270 h25 v15 h-25 z" },
];

const BACK_REGIONS: Region[] = [
  { key: "cabeza", d: "M100 25 a25 25 0 1 1 0.1 0 z" },
  { key: "cuello", d: "M88 50 h24 v15 h-24 z" },
  { key: "espalda-superior", d: "M70 65 h60 v40 h-60 z" },
  { key: "espalda-inferior", d: "M70 105 h60 v40 h-60 z" },
  { key: "gluteos", d: "M75 145 h50 v25 h-50 z" },
  { key: "brazo-der", d: "M55 70 h15 v55 h-15 z" },
  { key: "brazo-izq", d: "M130 70 h15 v55 h-15 z" },
  { key: "antebrazo-der", d: "M55 125 h15 v50 h-15 z" },
  { key: "antebrazo-izq", d: "M130 125 h15 v50 h-15 z" },
  { key: "mano-der", d: "M52 175 h21 v18 h-21 z" },
  { key: "mano-izq", d: "M127 175 h21 v18 h-21 z" },
  { key: "muslo-der", d: "M76 170 h22 v55 h-22 z" },
  { key: "muslo-izq", d: "M102 170 h22 v55 h-22 z" },
  { key: "pierna-der", d: "M78 225 h20 v50 h-20 z" },
  { key: "pierna-izq", d: "M102 225 h20 v50 h-20 z" },
  { key: "pie-der", d: "M75 275 h25 v15 h-25 z" },
  { key: "pie-izq", d: "M100 275 h25 v15 h-25 z" },
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

  return (
    <svg
      viewBox="0 0 200 295"
      className="w-full max-w-[280px] mx-auto select-none"
      style={{ touchAction: "manipulation" }}
    >
      {/* Outline silhouette */}
      <g
        fill="hsl(var(--muted))"
        stroke="hsl(var(--border))"
        strokeWidth="0.5"
        className="pointer-events-none"
      >
        {regions.map((r) => (
          <path key={`bg-${r.key}`} d={r.d} />
        ))}
      </g>

      {/* Interactive regions */}
      {!readOnly && (
        <g>
          {regions.map((r) => (
            <path
              key={r.key}
              d={r.d}
              fill={hover === r.key ? "hsl(var(--primary) / 0.3)" : "transparent"}
              stroke={hover === r.key ? "hsl(var(--primary))" : "transparent"}
              strokeWidth="1"
              className={cn("cursor-pointer transition-colors")}
              onMouseEnter={() => setHover(r.key)}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                const svg = (e.currentTarget.ownerSVGElement)!;
                const pt = svg.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const ctm = svg.getScreenCTM();
                if (!ctm) return;
                const local = pt.matrixTransform(ctm.inverse());
                const xPct = (local.x / 200) * 100;
                const yPct = (local.y / 295) * 100;
                onPick?.({ body_part: r.key, marker_x: xPct, marker_y: yPct });
              }}
            />
          ))}
        </g>
      )}

      {/* Markers */}
      {markers.map((m) => (
        <circle
          key={m.id}
          cx={(m.marker_x / 100) * 200}
          cy={(m.marker_y / 100) * 295}
          r="4"
          fill={SEVERITY_COLOR[m.severity]}
          stroke="hsl(var(--background))"
          strokeWidth="1.5"
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onMarkerClick?.(m.id);
          }}
        />
      ))}
    </svg>
  );
}
