import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle2, AlertCircle, CircleSlash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { SyncStatus } from "@/hooks/useMonitorHealth";

type Props = {
  status: SyncStatus;
  lastReadingAt: string | null;
  onRetry?: () => unknown | Promise<unknown>;
  retrying?: boolean;
  deviceLabel?: string | null;
};

const META: Record<SyncStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  ok:    { label: "Sincronizado",         icon: <CheckCircle2 className="h-3 w-3" />, cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  stale: { label: "Datos desactualizados", icon: <AlertCircle className="h-3 w-3" />,  cls: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  empty: { label: "Sin datos",             icon: <CircleSlash className="h-3 w-3" />, cls: "bg-muted text-muted-foreground border-border" },
};

export function SyncStatusPill({ status, lastReadingAt, onRetry, retrying, deviceLabel }: Props) {
  const meta = META[status];
  const relative = lastReadingAt
    ? formatDistanceToNow(new Date(lastReadingAt + "T00:00:00"), { addSuffix: true, locale: es })
    : "sin lecturas";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" className={`${meta.cls} gap-1`}>{meta.icon} {meta.label}</Badge>
      <span className="text-xs text-muted-foreground">
        Última lectura: <b>{relative}</b>{deviceLabel ? ` · ${deviceLabel}` : ""}
      </span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying} className="h-7 gap-1">
          {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Reintentar
        </Button>
      )}
    </div>
  );
}