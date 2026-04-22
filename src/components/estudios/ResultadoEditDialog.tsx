import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateResultado } from "@/hooks/useResultadosEstudio";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultado: any;
}

export function ResultadoEditDialog({ open, onOpenChange, resultado }: Props) {
  const update = useUpdateResultado();
  const [pdfName, setPdfName] = useState("");
  const [fecha, setFecha] = useState("");
  const [lab, setLab] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (open && resultado) {
      setPdfName(resultado.pdf_name ?? "");
      setFecha(resultado.fecha_resultado ? String(resultado.fecha_resultado).slice(0, 10) : "");
      setLab(resultado.laboratorio_nombre ?? "");
      setNotas(resultado.notas ?? "");
    }
  }, [open, resultado]);

  const handleSave = async () => {
    if (!pdfName.trim()) {
      toast.error("El nombre del estudio es requerido");
      return;
    }
    await update.mutateAsync({
      id: resultado.id,
      patch: {
        pdf_name: pdfName.trim(),
        fecha_resultado: fecha || null,
        laboratorio_nombre: lab.trim() || null,
        notas: notas.trim() || null,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar resultado</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nombre del estudio</Label>
            <Input value={pdfName} onChange={(e) => setPdfName(e.target.value)} placeholder="Ej. Hemograma completo" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Fecha del resultado</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Laboratorio</Label>
              <Input value={lab} onChange={(e) => setLab(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notas</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
