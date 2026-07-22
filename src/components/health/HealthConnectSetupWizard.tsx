import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Smartphone,
  Apple,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { getPlatform, requestHealthPermissions } from "@/lib/health";
import { toast } from "sonner";
import { WearableConnectionTest } from "@/components/health/WearableConnectionTest";

type Brand = "xiaomi" | "samsung";

const STORAGE_KEY = "cc:hc-wizard:v1";

function loadCompleted(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveCompleted(key: string) {
  const cur = loadCompleted();
  cur[key] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
}

const BRAND_META: Record<Brand, { label: string; app: string; appUrl: string }> = {
  xiaomi: {
    label: "Xiaomi (Smart Band / Redmi Watch)",
    app: "Mi Fitness (Xiaomi Wear)",
    appUrl: "https://play.google.com/store/apps/details?id=com.mi.health",
  },
  samsung: {
    label: "Samsung (Galaxy Watch / Fit)",
    app: "Samsung Health",
    appUrl: "https://play.google.com/store/apps/details?id=com.sec.android.app.shealth",
  },
};

export function HealthConnectSetupWizard() {
  const platform = getPlatform();
  const [brand, setBrand] = useState<Brand>("xiaomi");
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  const [requesting, setRequesting] = useState(false);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [runTest, setRunTest] = useState(false);

  useEffect(() => {
    setCompleted(loadCompleted());
  }, []);

  const meta = BRAND_META[brand];

  const steps = [
    {
      title: "Instala Google Health Connect",
      body: (
        <div className="space-y-2 text-sm">
          <p>
            En Android 14 y superior ya viene integrado en Ajustes → Seguridad y privacidad → Más
            ajustes → Health Connect. En Android 13 o menor, instálalo desde Play Store.
          </p>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata"
              target="_blank"
              rel="noreferrer"
              className="gap-1 inline-flex items-center"
            >
              <ExternalLink className="h-3 w-3" /> Abrir Health Connect en Play Store
            </a>
          </Button>
        </div>
      ),
    },
    {
      title: `Instala y abre ${meta.app}`,
      body: (
        <div className="space-y-2 text-sm">
          <p>
            {meta.app} es el puente entre tu {brand === "xiaomi" ? "wearable Xiaomi" : "wearable Samsung"} y
            Health Connect. Sin esta app no hay sincronización.
          </p>
          <Button variant="outline" size="sm" asChild>
            <a
              href={meta.appUrl}
              target="_blank"
              rel="noreferrer"
              className="gap-1 inline-flex items-center"
            >
              <ExternalLink className="h-3 w-3" /> Descargar {meta.app}
            </a>
          </Button>
        </div>
      ),
    },
    {
      title: "Empareja tu wearable y realiza una primera sincronización",
      body: (
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>Abre {meta.app} y sigue el asistente para emparejar tu reloj o banda.</li>
          <li>
            Realiza una medición manual de frecuencia cardíaca o SpO₂ desde el reloj para forzar la
            primera sincronización.
          </li>
          <li>
            Espera unos minutos y confirma que los datos aparezcan dentro de la app{" "}
            {brand === "xiaomi" ? "Mi Fitness" : "Samsung Health"}.
          </li>
        </ol>
      ),
    },
    {
      title: "Autoriza a la app puente a escribir en Health Connect",
      body: (
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>Abre Health Connect.</li>
          <li>Ve a <strong>Aplicaciones y permisos</strong>.</li>
          <li>Selecciona <strong>{meta.app}</strong>.</li>
          <li>
            Habilita <strong>lectura y escritura</strong> para: frecuencia cardíaca, SpO₂, pasos y
            sueño.
          </li>
        </ol>
      ),
    },
    {
      title: "Autoriza a CareCentral a leer Health Connect",
      body: (
        <div className="space-y-3 text-sm">
          <p>
            Este paso solo funciona desde la app móvil (Capacitor) de CareCentral. Se abrirá el
            diálogo de permisos de Health Connect para que apruebes la lectura de tus métricas.
          </p>
          <Button
            onClick={async () => {
              setRequesting(true);
              try {
                const res = await requestHealthPermissions();
                if (res) toast.success("Permisos otorgados");
                else toast.error("Permisos no concedidos");
              } catch (e: any) {
                toast.error(e?.message ?? "No se pudo solicitar permisos");
              } finally {
                setRequesting(false);
              }
            }}
            disabled={requesting || platform === "web"}
            className="gap-2"
          >
            {requesting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Solicitar permisos ahora
          </Button>
          {platform === "web" && (
            <Alert>
              <AlertTitle className="text-xs">Solo en app móvil</AlertTitle>
              <AlertDescription className="text-xs">
                Estás viendo CareCentral desde el navegador. Descarga la app Android para completar
                este paso.
              </AlertDescription>
            </Alert>
          )}
        </div>
      ),
    },
    {
      title: "Verifica la conexión con una prueba real",
      body: (
        <div className="space-y-3 text-sm">
          <p>
            Ejecuta una prueba que muestre qué métricas se importaron desde tu wearable.
          </p>
          {runTest ? (
            <WearableConnectionTest />
          ) : (
            <Button onClick={() => setRunTest(true)} className="gap-2">
              <Sparkles className="h-4 w-4" /> Abrir prueba de conexión
            </Button>
          )}
        </div>
      ),
    },
  ];

  const iosWarning = platform === "ios";
  const done = completed[brand];

  const finish = () => {
    saveCompleted(brand);
    setCompleted(loadCompleted());
    toast.success(`Asistente ${meta.label} completado`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          Asistente Health Connect
          {done && (
            <Badge className="ml-2 gap-1 bg-emerald-500/15 text-emerald-700 border-emerald-500/30" variant="outline">
              <CheckCircle2 className="h-3 w-3" /> Completado
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {iosWarning && (
          <Alert>
            <Apple className="h-4 w-4" />
            <AlertTitle>Estás en iPhone</AlertTitle>
            <AlertDescription>
              Este asistente aplica a Android. En iOS los wearables se sincronizan vía Apple Health;
              conéctalo desde <strong>Historial de salud → Conectar HealthKit</strong>.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          {(["xiaomi", "samsung"] as const).map((b) => (
            <Button
              key={b}
              size="sm"
              variant={brand === b ? "default" : "outline"}
              onClick={() => {
                setBrand(b);
                setStep(0);
                setChecks({});
                setRunTest(false);
              }}
            >
              {BRAND_META[b].label}
            </Button>
          ))}
        </div>

        <div className="rounded-md border p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Paso {step + 1} de {steps.length}
            </span>
            <span>{steps[step].title}</span>
          </div>
          <div className="h-1.5 bg-muted rounded overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="space-y-3 pt-1">
            <h4 className="font-semibold text-sm">{steps[step].title}</h4>
            {steps[step].body}

            <label className="flex items-start gap-2 pt-2 cursor-pointer">
              <Checkbox
                checked={!!checks[step]}
                onCheckedChange={(v) => setChecks((c) => ({ ...c, [step]: !!v }))}
              />
              <span className="text-xs text-muted-foreground">
                Confirmo que completé este paso
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </Button>
            {step < steps.length - 1 ? (
              <Button
                size="sm"
                disabled={!checks[step]}
                onClick={() => setStep((s) => s + 1)}
                className="gap-1"
              >
                Siguiente <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" disabled={!checks[step]} onClick={finish} className="gap-1">
                <CheckCircle2 className="h-4 w-4" /> Marcar como completado
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}