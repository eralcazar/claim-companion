import { AlertTriangle } from "lucide-react";
import { useExternalProvidersEnabled } from "@/hooks/useAiGovernance";

/**
 * Circuit-breaker visual: se muestra cuando el kill switch admin apagó los
 * proveedores externos y una feature intentó usar uno. Debajo del banner el
 * router del edge function cae automáticamente a Lovable AI.
 */
export function AiProviderStatusBanner({ feature }: { feature?: string }) {
  const { data: enabled } = useExternalProvidersEnabled();
  if (enabled !== false) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs">
      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
      <div>
        <strong>Modo seguro:</strong> proveedores externos desactivados por administración
        {feature ? ` para ${feature}` : ""}. Todas las llamadas de IA se enrutan a Lovable AI.
      </div>
    </div>
  );
}