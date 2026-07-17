import { Badge } from "@/components/ui/badge";
import { useGlobalCfdiMode } from "@/hooks/useCfdi";
import { FlaskConical, Wrench, ShieldCheck, AlertTriangle } from "lucide-react";

export function CfdiModeBadge({ compact = false }: { compact?: boolean }) {
  const modo = useGlobalCfdiMode();
  const meta = {
    simulado: { label: "CFDI SIMULADO", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", Icon: Wrench },
    sandbox: { label: "CFDI MODO PRUEBAS", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30", Icon: FlaskConical },
    produccion: { label: "CFDI PRODUCCIÓN", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", Icon: ShieldCheck },
    mixto: { label: "CFDI CONFIG MIXTA", cls: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30", Icon: AlertTriangle },
  }[modo];
  return (
    <Badge variant="outline" className={`gap-1 ${meta.cls}`}>
      <meta.Icon className="h-3 w-3" />
      {compact ? meta.label.split(" ").pop() : meta.label}
    </Badge>
  );
}

export function CfdiTestModeBanner() {
  const modo = useGlobalCfdiMode();
  if (modo === "produccion") return null;
  const messages: Record<string, string> = {
    simulado: "Facturación en MODO SIMULADO — los CFDI no son válidos ante el SAT. Configura tu emisor en /admin/facturacion.",
    sandbox: "Facturación en MODO PRUEBAS (SANDBOX) — los CFDI usan certificados de prueba y no son válidos ante el SAT.",
    mixto: "Hay emisores en sandbox y otros en producción. Revisa la configuración en /admin/facturacion.",
  };
  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs px-3 py-1.5 flex items-center gap-2">
      <FlaskConical className="h-3.5 w-3.5" />
      <span>{messages[modo]}</span>
    </div>
  );
}