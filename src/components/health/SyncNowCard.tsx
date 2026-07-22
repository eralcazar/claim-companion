import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { useHealthDevices } from "@/hooks/useHealthDevices";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export function SyncNowCard() {
  const { available, lastSyncedAt, platform, requestPerms, sync } = useHealthDevices();
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const runSync = async () => {
    setLastResult(null);
    setProgress(10);
    try {
      if (!available) {
        await requestPerms.mutateAsync();
      }
      setProgress(40);
      const timer = setInterval(() => setProgress((p) => Math.min(p + 8, 88)), 400);
      const res = await sync.mutateAsync();
      clearInterval(timer);
      setProgress(100);
      const msg = `Se importaron ${res.total} lecturas`;
      setLastResult({ ok: true, msg });
      toast.success(msg);
    } catch (e: any) {
      setLastResult({ ok: false, msg: e?.message ?? "Error de sincronización" });
      toast.error(e?.message ?? "Error de sincronización");
    } finally {
      setTimeout(() => setProgress(0), 1500);
    }
  };

  const platformLabel = platform === "ios" ? "Apple Health" : platform === "android" ? "Health Connect" : "Web";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" /> Sincronizar ahora
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{platformLabel}</Badge>
          <Badge variant={available ? "outline" : "destructive"}>
            {available ? "Disponible" : "No disponible"}
          </Badge>
          <Badge variant="outline">
            Última: {lastSyncedAt ? format(new Date(lastSyncedAt), "dd MMM yyyy · HH:mm", { locale: es }) : "nunca"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Re-ejecuta la importación desde tu proveedor de salud (Health Connect / Apple Health) para el dispositivo activo.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={runSync} disabled={sync.isPending} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />
            {sync.isPending ? "Sincronizando..." : "Sincronizar ahora"}
          </Button>
          {progress > 0 && <Progress value={progress} className="flex-1 h-2" />}
        </div>
        {lastResult && (
          <div className={`flex items-center gap-2 text-sm ${lastResult.ok ? "text-emerald-600" : "text-rose-600"}`}>
            {lastResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {lastResult.msg}
          </div>
        )}
      </CardContent>
    </Card>
  );
}