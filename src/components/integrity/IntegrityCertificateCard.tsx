import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/contexts/ImpersonationContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Link as LinkIcon, ShieldCheck, Loader2, Copy, Ban } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

/**
 * Patient-facing integrity actions:
 * - Download today's daily integrity certificate (PDF)
 * - Create a shareable verification link for a third party
 * - List and revoke existing tokens
 */
export function IntegrityCertificateCard({ patientId }: { patientId?: string }) {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const targetPatient = patientId ?? effectiveUserId;
  const qc = useQueryClient();
  const [expiresDays, setExpiresDays] = useState(30);
  const [maxUses, setMaxUses] = useState<string>("");

  const downloadPdf = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("integrity-certificate-pdf", {
        body: { patient_id: targetPatient },
      });
      if (error) throw error;
      const blob = data instanceof Blob ? data : new Blob([data as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comprobante-integridad-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: any) => toast.error(e.message || "No se pudo descargar"),
    onSuccess: () => toast.success("Comprobante descargado"),
  });

  const { data: tokens } = useQuery({
    queryKey: ["integrity-share-tokens", targetPatient],
    enabled: !!targetPatient,
    queryFn: async () => {
      const { data } = await supabase
        .from("integrity_share_tokens")
        .select("*")
        .eq("patient_id", targetPatient!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const createToken = useMutation({
    mutationFn: async () => {
      if (!targetPatient || !user) throw new Error("Sin paciente");
      const expires_at = new Date(Date.now() + expiresDays * 86400_000).toISOString();
      const { data, error } = await supabase
        .from("integrity_share_tokens")
        .insert({
          scope: "patient_daily",
          patient_id: targetPatient,
          created_by: user.id,
          expires_at,
          max_uses: maxUses ? Number(maxUses) : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Enlace creado"); qc.invalidateQueries({ queryKey: ["integrity-share-tokens", targetPatient] }); },
    onError: (e: any) => toast.error(e.message || "No se pudo crear el enlace"),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("integrity_share_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Enlace revocado"); qc.invalidateQueries({ queryKey: ["integrity-share-tokens", targetPatient] }); },
    onError: (e: any) => toast.error(e.message || "No se pudo revocar"),
  });

  const publicUrl = (token: string) => `${window.location.origin}/verificar/${token}`;
  const copy = async (t: string) => { await navigator.clipboard.writeText(publicUrl(t)); toast.success("Enlace copiado"); };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> Comprobante de integridad
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="text-sm text-muted-foreground">
          Descarga tu comprobante de integridad del día (raíz diaria + cadena) o comparte un enlace para que un tercero lo verifique sin entrar a la app.
        </div>

        <Button onClick={() => downloadPdf.mutate()} disabled={downloadPdf.isPending}>
          {downloadPdf.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          Descargar PDF de hoy
        </Button>

        <div className="border-t pt-4 space-y-3">
          <div className="text-sm font-medium">Crear enlace compartible</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Vigencia (días)</Label>
              <Input type="number" min={1} max={365} value={expiresDays} onChange={(e) => setExpiresDays(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Máx. usos (opcional)</Label>
              <Input type="number" min={1} placeholder="Ilimitado" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => createToken.mutate()} disabled={createToken.isPending}>
            <LinkIcon className="h-4 w-4 mr-1" /> Generar enlace
          </Button>
        </div>

        {!!tokens?.length && (
          <div className="space-y-2 border-t pt-4">
            <div className="text-sm font-medium">Enlaces activos</div>
            {tokens.map((t: any) => {
              const expired = new Date(t.expires_at) < new Date();
              const revoked = !!t.revoked_at;
              return (
                <div key={t.id} className="flex items-center justify-between gap-2 border rounded-md p-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-mono">{publicUrl(t.token)}</div>
                    <div className="text-muted-foreground flex gap-2 flex-wrap mt-0.5">
                      <Badge variant={revoked ? "destructive" : expired ? "secondary" : "default"} className="text-[10px]">
                        {revoked ? "revocado" : expired ? "expirado" : "vigente"}
                      </Badge>
                      <span>Exp: {format(new Date(t.expires_at), "yyyy-MM-dd")}</span>
                      <span>Usos: {t.uses_count}{t.max_uses ? `/${t.max_uses}` : ""}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copy(t.token)}><Copy className="h-4 w-4" /></Button>
                    {!revoked && (
                      <Button variant="ghost" size="icon" onClick={() => revoke.mutate(t.id)}><Ban className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}