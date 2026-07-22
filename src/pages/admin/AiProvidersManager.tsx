import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, ShieldCheck, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { useExternalProviders, useUpdateExternalProvider, type ExternalProviderRow } from "@/hooks/useAiPolicies";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

function ProviderCard({ p }: { p: ExternalProviderRow }) {
  const update = useUpdateExternalProvider();
  const [defaultModel, setDefaultModel] = useState<string>(p.default_model ?? p.models[0]?.id ?? "");
  const dirtyModel = defaultModel !== (p.default_model ?? "");

  const openSecretForm = () => {
    // Los secrets se gestionan desde el chat con Lovable — el usuario debe pedirle al
    // agente que configure/rote la key con add_secret / update_secret. Esta UI sólo lo guía.
    toast({
      title: `Configura ${p.secret_name}`,
      description:
        "Pídele a Lovable en el chat: “Configura el secret " +
        (p.secret_name ?? "") +
        "”. El asistente abrirá el formulario seguro para pegar tu API key.",
    });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">{p.nombre}</h3>
              <Badge variant="outline" className="font-mono text-[10px]">{p.id}</Badge>
              {p.activo ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600">Activo</Badge>
              ) : (
                <Badge variant="secondary">Inactivo</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{p.aviso_legal}</p>
            {p.docs_url && (
              <a
                href={p.docs_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                Documentación oficial <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={p.activo}
              onCheckedChange={(v) => update.mutate({ id: p.id, activo: v })}
              disabled={update.isPending}
              aria-label="Activar proveedor"
            />
            <span className="text-xs">Activar</span>
          </div>
        </div>

        {p.requires_api_key && (
          <div className="border rounded-md p-3 bg-muted/40 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs">
                <div className="font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  API key ({p.secret_name})
                </div>
                <p className="text-muted-foreground mt-0.5">
                  El valor se guarda cifrado en Lovable Cloud como variable de entorno del backend.
                  Nunca se expone al navegador ni queda persistido en la base de datos.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={openSecretForm}>
                Configurar / Rotar
              </Button>
            </div>
            <div className="text-[11px] rounded border border-amber-500/40 bg-amber-500/10 p-2 text-amber-900 dark:text-amber-200 flex gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Al activar este proveedor, los prompts sanitizados de las features asignadas se enviarán a
                los servidores de {p.nombre}. Verifica que tu contrato con el proveedor cubra el uso previsto
                y que los usuarios finales otorguen consentimiento en “Mis datos y IA”.
              </span>
            </div>
          </div>
        )}

        {p.models.length > 0 && (
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Modelo por defecto</Label>
              <Select value={defaultModel} onValueChange={setDefaultModel}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Elegir modelo" /></SelectTrigger>
                <SelectContent>
                  {p.models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Se usa cuando una política no especifica modelo explícito.
              </p>
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                disabled={!dirtyModel || update.isPending}
                onClick={() => update.mutate({ id: p.id, default_model: defaultModel })}
              >
                {update.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Guardar modelo
              </Button>
            </div>
          </div>
        )}

        {p.models.length > 0 && (
          <div>
            <Label className="text-xs">Modelos soportados</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {p.models.map((m) => (
                <Badge key={m.id} variant="outline" className="font-mono text-[10px]">{m.id}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AiProvidersManager() {
  const { roles } = useAuth();
  const { data: providers = [], isLoading } = useExternalProviders();

  if (!roles?.includes("admin")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold">Proveedores de IA externos</h1>
        <p className="text-sm text-muted-foreground">
          Configura tus propias API keys para Google Gemini y Mistral (BYOK). Los usuarios ven estos
          proveedores en <span className="font-medium">Mis datos y IA</span> y deben otorgar consentimiento
          explícito por feature antes de que se envíen prompts al proveedor externo.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando proveedores…</p>}

      <div className="space-y-3">
        {providers.map((p) => <ProviderCard key={p.id} p={p} />)}
      </div>

      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">Notas legales y de cumplimiento</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Los prompts se sanitizan (CURP, RFC, email, teléfono, direcciones, fechas, números largos) antes de salir de la app.</li>
            <li>El kill switch global en “Uso de Kari” fuerza el fallback a Lovable AI para todas las features.</li>
            <li>Cada llamada a un proveedor externo se registra en <span className="font-mono">ai_provider_audit</span> con evidencia de sanitización, consentimiento y latencia.</li>
            <li>La responsabilidad contractual con Google/Mistral es del operador de CareCentral cuando se usa BYOK.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}