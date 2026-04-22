import { Download, Share2, FileDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  exportTendenciasToCSV,
  type ExportTendenciasOptions,
} from "@/lib/exportTendenciasCSV";
import type { TendenciaIndicador } from "@/hooks/useTendencias";

interface Props {
  indicadores: TendenciaIndicador[];
  pacienteNombre: string;
  rangoLabel: string;
  modo: "individual" | "comparar";
}

export function ExportTendenciasButton({
  indicadores,
  pacienteNombre,
  rangoLabel,
  modo,
}: Props) {
  const disabled = indicadores.length === 0;

  const build = (): { blob: Blob; filename: string } => {
    const opts: ExportTendenciasOptions = { pacienteNombre, rangoLabel, modo };
    return exportTendenciasToCSV(indicadores, opts);
  };

  const handleDownload = () => {
    try {
      const { blob, filename } = build();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV descargado");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al exportar");
    }
  };

  const handleShare = async () => {
    try {
      const { blob, filename } = build();
      const file = new File([blob], filename, { type: "text/csv" });
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({
          files: [file],
          title: "Tendencias de indicadores",
          text: `Tendencias de ${pacienteNombre} (${rangoLabel})`,
        });
        return;
      }
      // Fallback
      handleDownload();
      toast.message("Compartir no disponible", {
        description: "Archivo descargado, puedes compartirlo manualmente.",
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      toast.error(e?.message ?? "Error al compartir");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-1"
          title={disabled ? "No hay datos para exportar" : "Exportar tendencias"}
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownload}>
          <FileDown className="h-4 w-4 mr-2" />
          Descargar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Compartir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}