import { useState } from "react";
import { useFirmas } from "@/hooks/useFirmas";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pen, Star } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  value?: string | null; // firma_id
  onChange: (firmaId: string | null) => void;
  label?: string;
}

/**
 * Selector de firma del usuario. Muestra preview de la firma actual y permite
 * cambiar entre las firmas guardadas en el gestor (`/perfil/firmas`).
 */
export default function SignaturePicker({ value, onChange, label }: Props) {
  const { user } = useAuth();
  const { data: firmas = [] } = useFirmas(user?.id);
  const [open, setOpen] = useState(false);

  const current = firmas.find((f) => f.id === value)
    || firmas.find((f) => f.es_predeterminada)
    || firmas[0]
    || null;

  // Auto-seleccionar predeterminada si aún no hay valor
  if (!value && current) {
    setTimeout(() => onChange(current.id), 0);
  }

  if (firmas.length === 0) {
    return (
      <div className="space-y-2">
        {label && <p className="text-xs font-medium">{label}</p>}
        <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground space-y-2">
          <p>No tienes firmas guardadas.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/perfil/firmas">
              <Pen className="h-3 w-3 mr-1" /> Crear firma en mi perfil
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-medium">{label}</p>}
      <div className="rounded-md border bg-background p-2">
        {current ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center justify-center min-h-[60px]">
              <img
                src={current.imagen_base64}
                alt={current.nombre}
                className="max-h-20 object-contain"
              />
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-xs font-medium">{current.nombre}</p>
              {current.es_predeterminada && (
                <Badge variant="secondary" className="text-[10px]">
                  <Star className="h-2.5 w-2.5 mr-1 fill-current" /> Predet.
                </Badge>
              )}
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    Cambiar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Elegir firma</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
                    {firmas.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          onChange(f.id);
                          setOpen(false);
                        }}
                        className={`rounded-md border p-2 text-left hover:bg-muted/50 transition ${
                          f.id === current.id ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={f.imagen_base64}
                            alt={f.nombre}
                            className="h-12 max-w-[100px] object-contain bg-background border rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{f.nombre}</p>
                            {f.es_predeterminada && (
                              <Badge variant="secondary" className="text-[10px] mt-1">
                                Predeterminada
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}