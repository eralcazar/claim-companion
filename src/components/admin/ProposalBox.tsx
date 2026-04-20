import type { ProposedField } from "./VisualEditor";
import { cn } from "@/lib/utils";

interface Props {
  proposal: ProposedField;
  selected: boolean;
  onSelect: () => void;
}

/** Yellow dashed overlay for AI-detected proposals (not yet persisted). Renders both label (pregunta) and campo (respuesta). */
export function ProposalBox({ proposal, selected, onSelect }: Props) {
  const c = proposal.campo;
  const l = proposal.label;
  const dimmed = proposal.accepted === false;
  return (
    <>
      {l && (
        <div
          className={cn(
            "absolute border border-dashed border-info/70 bg-info/5 pointer-events-none",
            dimmed && "opacity-40",
            selected && "border-info",
          )}
          style={{
            left: `${l.x}%`,
            top: `${l.y}%`,
            width: `${l.w}%`,
            height: `${l.h}%`,
          }}
          title={`Pregunta: ${proposal.etiqueta}`}
        />
      )}
      <div
        className={cn(
          "absolute border-2 border-dashed cursor-pointer transition-all",
          dimmed
            ? "border-muted-foreground/40 bg-muted/20 opacity-50"
            : "border-warning bg-warning/10 hover:bg-warning/20",
          selected && "ring-2 ring-warning ring-offset-1 z-10",
        )}
        style={{
          left: `${c.x}%`,
          top: `${c.y}%`,
          width: `${c.w}%`,
          height: `${c.h}%`,
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        title={`${proposal.clave} — ${proposal.etiqueta}`}
      >
        <span className="absolute -top-5 left-0 text-[10px] font-mono px-1 rounded bg-warning/90 text-warning-foreground border whitespace-nowrap pointer-events-none">
          {proposal.clave}
        </span>
      </div>
    </>
  );
}