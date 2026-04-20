import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useAseguradoras, useFormularios, type Formulario } from "@/hooks/useFormatos";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  selectedId: string | null;
  onSelect: (form: Formulario) => void;
}

export function InsurerTree({ selectedId, onSelect }: Props) {
  const { data: aseguradoras, isLoading: loadingA } = useAseguradoras();
  const { data: formularios, isLoading: loadingF } = useFormularios();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loadingA || loadingF) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {aseguradoras?.map((a) => {
        const forms = formularios?.filter((f) => f.aseguradora_id === a.id) ?? [];
        const isOpen = expanded.has(a.id);
        return (
          <div key={a.id}>
            <button
              onClick={() => toggle(a.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent"
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="flex-1 text-left">{a.nombre}</span>
              <span className="text-xs text-muted-foreground">({forms.length})</span>
            </button>
            {isOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                {forms.length === 0 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">Sin formularios</div>
                )}
                {forms.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onSelect(f)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                      selectedId === f.id && "bg-accent font-medium text-accent-foreground"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate text-left">{f.nombre_display}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}