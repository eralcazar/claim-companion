import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CareCentralLogo } from "@/components/brand/CareCentralLogo";
import { ShieldCheck, Sparkles, ScanLine } from "lucide-react";
import kariAvatar from "@/assets/kari-avatar.png";

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSignIn = async (provider: "google" | "apple") => {
    const result = await lovable.auth.signInWithOAuth(provider);
    if (result?.error) {
      toast.error("Error al iniciar sesión. Intente de nuevo.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Fondo: degradado + blobs */}
      <div className="absolute inset-0 gradient-hero" aria-hidden />
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" aria-hidden />
      <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-accent/30 blur-3xl" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-8 px-4 py-8 lg:flex-row lg:gap-12 lg:py-16">
        {/* Columna izquierda: Kari + beneficios */}
        <div className="relative flex flex-1 flex-col items-center text-center lg:items-start lg:text-left animate-fade-in min-h-[36rem] lg:min-h-[40rem] w-full">
          {/* Header: logo + tagline */}
          <div className="relative z-20 mb-4 flex flex-col items-center lg:items-start">
            <CareCentralLogo size={56} withText />
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Tu salud, <span className="text-primary">conectada</span> contigo
            </p>
          </div>

          {/* Capa 0: piernas de Kari como silueta de fondo (parte inferior, blur) */}
          <img
            src={kariAvatar}
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-1/2 bottom-0 h-[34rem] w-auto -translate-x-1/2 object-contain opacity-20 blur-md lg:left-0 lg:translate-x-0"
            style={{
              objectPosition: "center bottom",
              maskImage:
                "linear-gradient(to top, black 0%, black 35%, transparent 60%)",
              WebkitMaskImage:
                "linear-gradient(to top, black 0%, black 35%, transparent 60%)",
            }}
          />

          {/* Capa 2: Kari recortada hasta la cintura (parte superior nítida) */}
          <div className="relative z-10 mt-2 self-center lg:self-start">
            <div
              className="relative h-64 w-56 sm:h-72 sm:w-64 lg:h-80 lg:w-72 overflow-hidden"
              style={{
                maskImage:
                  "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
              }}
            >
              <img
                src={kariAvatar}
                alt="Kari, tu asistente médica de CareCentral"
                className="absolute inset-x-0 top-0 mx-auto h-[28rem] w-auto object-contain drop-shadow-2xl"
                loading="eager"
              />
            </div>

            {/* Capa 3: Burbuja de chat junto a la cabeza */}
            <div className="absolute -right-4 top-6 sm:-right-8 sm:top-8 lg:-right-2 lg:top-10 z-20 animate-fade-in">
              <div className="relative rounded-2xl rounded-bl-sm bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl">
                ¡Hola! Soy Kari 👋
                {/* Cola de la burbuja apuntando a Kari */}
                <span className="absolute -left-1.5 bottom-2 h-3 w-3 rotate-45 bg-foreground" />
              </div>
            </div>
          </div>

          {/* Capa 1: Tipografía + beneficios — sube hasta la cintura de Kari */}
          <div className="relative z-10 mt-4 w-full max-w-md self-center lg:self-start">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Tu salud, <span className="text-primary">en un solo lugar</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Expediente digital, recordatorios y reclamos médicos al alcance de tu familia.
            </p>

            {/* Beneficios */}
            <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { icon: ScanLine, label: "Escaneo OCR" },
                { icon: ShieldCheck, label: "Datos seguros" },
                { icon: Sparkles, label: "Asistente IA" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="glass-card flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-medium text-foreground"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha: tarjeta de login */}
        <div className="w-full max-w-sm animate-fade-in">
          <div className="glass-card rounded-3xl p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="font-heading text-2xl font-bold text-foreground">Bienvenido</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Inicia sesión para continuar
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="h-12 w-full gap-3 rounded-2xl border-border/60 bg-white text-base font-medium shadow-sm hover:bg-white hover:shadow-md transition-all"
                onClick={() => handleSignIn("google")}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar con Google
              </Button>
              <Button
                className="h-12 w-full gap-3 rounded-2xl bg-foreground text-base font-medium text-background shadow-sm hover:bg-foreground/90 transition-all"
                onClick={() => handleSignIn("apple")}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continuar con Apple
              </Button>
            </div>

            <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
              Al continuar aceptas los <span className="underline">Términos</span> y{" "}
              <span className="underline">Política de privacidad</span> de CareCentral.
            </p>
          </div>

          {/* Paquete gratuito badge */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Incluye <strong className="text-foreground">5 escaneos OCR gratis</strong> al registrarte
          </div>
        </div>
      </div>
    </div>
  );
}
