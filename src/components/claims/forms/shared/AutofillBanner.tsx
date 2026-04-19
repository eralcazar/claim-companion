import { Info } from "lucide-react";

export default function AutofillBanner() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <p>
        Los datos de tu perfil y póliza se han cargado automáticamente. Puedes editarlos si es necesario.
      </p>
    </div>
  );
}
