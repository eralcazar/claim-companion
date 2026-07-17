import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CareCentralLogo } from "@/components/brand/CareCentralLogo";
import { Download, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";

type TokenInfo = {
  scope: "patient_daily" | "record";
  patient_id: string;
  table_name?: string;
  record_id?: string;
  expires_at: string;
  revoked_at: string | null;
  uses_count: number;
  max_uses: number | null;
};

export default function VerifyShare() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data, error } = await supabase
        .from("integrity_share_tokens")
        .select("scope, patient_id, table_name, record_id, expires_at, revoked_at, uses_count, max_uses")
        .eq("token", token)
        .maybeSingle();
      if (error || !data) setError("Token no encontrado. El emisor puede haberlo revocado.");
      else setInfo(data as TokenInfo);
      setLoading(false);
    })();
  }, [token]);

  const verify = async () => {
    if (!info || !token) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-record-integrity", {
        body: {
          table: info.table_name ?? "medical_records",
          id: info.record_id ?? info.patient_id,
          share_token: token,
        },
      });
      if (error) throw error;
      setResult(data);
    } catch (e: any) {
      setError(e.message || "No se pudo verificar");
    } finally {
      setVerifying(false);
    }
  };

  const downloadPdf = async () => {
    if (!token) return;
    setPdfLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("integrity-certificate-pdf", {
        body: { share_token: token },
      });
      if (error) throw error;
      const blob = data instanceof Blob ? data : new Blob([data as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comprobante-integridad-${token}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "No se pudo descargar el comprobante");
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  );

  const expired = info && new Date(info.expires_at) < new Date();
  const revoked = info?.revoked_at != null;
  const exhausted = info?.max_uses != null && info.uses_count >= info.max_uses;
  const usable = info && !expired && !revoked && !exhausted;

  return (
    <div className="min-h-screen bg-muted/30 flex items-start justify-center p-4">
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center justify-center py-4"><CareCentralLogo /></div>
        <Card>
          <CardHeader>
            <CardTitle>Verificación pública de integridad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="text-sm text-destructive">{error}</div>}
            {info && (
              <div className="space-y-2 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={usable ? "default" : "destructive"}>
                    {revoked ? "Revocado" : expired ? "Expirado" : exhausted ? "Agotado" : "Vigente"}
                  </Badge>
                  <Badge variant="outline">
                    {info.scope === "patient_daily" ? "Expediente diario" : "Registro individual"}
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  Expira: {new Date(info.expires_at).toLocaleString()}<br />
                  Usos: {info.uses_count}{info.max_uses ? ` / ${info.max_uses}` : ""}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={verify} disabled={!usable || verifying}>
                    {verifying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                    Verificar firma
                  </Button>
                  <Button variant="outline" onClick={downloadPdf} disabled={!usable || pdfLoading}>
                    {pdfLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                    Descargar comprobante PDF
                  </Button>
                </div>
              </div>
            )}

            {result && (
              <div className="border-t pt-4 space-y-1 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  {result.valid ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldAlert className="h-5 w-5 text-destructive" />}
                  Estado: {result.status}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>Cadena SHA-256: {result.chain_ok ? "válida" : "rota"}</div>
                  <div>Payload: {result.payload_ok ? "coincide" : "no coincide"}</div>
                  <div>Firma HMAC: {result.signature_ok === null ? "sin firma" : result.signature_ok ? "válida" : "inválida"}</div>
                  {result.key_id && <div>Llave: {result.key_id}</div>}
                  {result.algorithm_version && <div>Algoritmo: {result.algorithm_version}</div>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-center text-muted-foreground">
          CareCentral · Este enlace permite verificar la integridad sin acceder al expediente clínico.
        </p>
      </div>
    </div>
  );
}