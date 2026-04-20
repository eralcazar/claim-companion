import type { ProposedField } from "./VisualEditor";
import { cn } from "@/lib/utils";

interface Props {
  proposal: ProposedField;
  selected: boolean;
  onSelect: () => void;
}

/** Yellow dashed overlay for AI-detected proposals (not yet persisted). */
export function ProposalBox({ proposal, selected, onSelect }: Props) {
  return (
    <div
      className={cn(
        "absolute border-2 border-dashed cursor-pointer transition-all",
        proposal.accepted === false
          ? "border-muted-foreground/40 bg-muted/20 opacity-50"
          : "border-warning bg-warning/10 hover:bg-warning/20",
        selected && "ring-2 ring-warning ring-offset-1 z-10",
      )}
      style={{
        left: `${proposal.x}%`,
        top: `${proposal.y}%`,
        width: `${proposal.w}%`,
        height: `${proposal.h}%`,
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
  );
}