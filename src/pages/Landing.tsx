import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CareCentralLogo } from "@/components/brand/CareCentralLogo";
import {
  FileText,
  BellRing,
  ScanLine,
  Sparkles,
  ShieldCheck,
  HeartPulse,
  Stethoscope,
  Briefcase,
  Pill,
  FlaskConical,
  ArrowRight,
} from "lucide-react";
import kariAvatar from "@/assets/kari-avatar.png";

const features = [
  {
    icon: FileText,
    title: "Expediente digital familiar",
    desc: "Toda la información médica de tu familia centralizada y siempre a la mano.",
  },
  {
    icon: BellRing,
    title: "Recordatorios inteligentes",
    desc: "Medicamentos, citas y controles a tiempo, con notificaciones automáticas.",
  },
  {
    icon: ScanLine,
    title: "Reclamos médicos con OCR",
    desc: "Sube tus facturas y CareCentral llena los formularios por ti.",
  },
  {
    icon: Sparkles,
    title: "Asistente IA Kari",
    desc: "Resuelve dudas sobre tu salud y tus trámites con tu asistente personal.",
  },
];

const audiences = [
  { icon: HeartPulse, label: "Pacientes y familias" },
  { icon: Stethoscope, label: "Médicos" },
  { icon: Briefcase, label: "Brokers de seguros" },
  { icon: FlaskConical, label: "Laboratorios" },
  { icon: Pill, label: "Farmacias" },
];

const steps = [
  { n: "1", title: "Regístrate gratis", desc: "Crea tu cuenta con Google o Apple en segundos." },
  { n: "2", title: "Conecta tu información", desc: "Sube pólizas, recetas y estudios. Kari los organiza por ti." },
  { n: "3", title: "Gestiona tu salud", desc: "Recordatorios, reclamos y expediente, todo desde un solo lugar." },
];

export default function Landing() {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <CareCentralLogo size={36} withText />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" className="hidden sm:inline-flex rounded-2xl" onClick={scrollToFeatures}>
              Conocer más
            </Button>
            <Button asChild className="rounded-2xl">
              <Link to="/login">Iniciar sesión</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" aria-hidden />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-accent/30 blur-3xl" aria-hidden />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-in text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Salud inteligente para tu familia
            </span>
            <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Tu salud, <span className="text-primary">en un solo lugar</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              CareCentral reúne tu expediente digital, recordatorios, pólizas y reclamos médicos.
              Con Kari, tu asistente IA, todo es más simple.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild size="lg" className="h-12 rounded-2xl px-6 text-base shadow-lg">
                <Link to="/login">
                  Iniciar sesión
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-2xl px-6 text-base"
                onClick={scrollToFeatures}
              >
                Conocer más
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground lg:justify-start">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Datos cifrados · Comienza gratis con 5 OCR al mes
            </div>
          </div>

          <div className="relative mx-auto h-80 w-72 sm:h-96 sm:w-80 lg:h-[28rem] lg:w-96 animate-fade-in">
            <img
              src={kariAvatar}
              alt="Kari, tu asistente médica de CareCentral"
              className="mx-auto h-full w-auto object-contain drop-shadow-2xl"
            />
            <div className="absolute right-0 top-8 z-10 rounded-2xl rounded-bl-sm bg-foreground px-3.5 py-2 text-xs font-medium text-background shadow-xl">
              ¡Hola! Soy Kari 👋
              <span className="absolute -left-1 bottom-2 h-3 w-3 rotate-45 bg-foreground" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            ¿Qué es CareCentral?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Una plataforma de salud integral diseñada para pacientes, médicos y aseguradoras.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="glass-card rounded-3xl p-6 transition-transform hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Audiences */}
      <section className="bg-muted/30 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Para todo el ecosistema de salud
            </h2>
            <p className="mt-3 text-muted-foreground">
              CareCentral conecta a cada actor del cuidado médico.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {audiences.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm font-medium shadow-sm"
              >
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Cómo funciona
          </h2>
          <p className="mt-3 text-muted-foreground">
            En tres pasos tienes toda tu salud organizada.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="relative rounded-3xl border border-border/60 bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary font-heading text-lg font-bold text-primary-foreground">
                {n}
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-20">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl p-10 text-center sm:p-14">
          <div className="absolute inset-0 gradient-hero" aria-hidden />
          <div className="relative">
            <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Comienza gratis con <span className="text-primary">5 OCR al mes</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Crea tu cuenta y descubre cómo CareCentral simplifica el cuidado de tu salud.
            </p>
            <Button asChild size="lg" className="mt-6 h-12 rounded-2xl px-8 text-base shadow-lg">
              <Link to="/login">
                Iniciar sesión
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <CareCentralLogo size={24} />
            <span>© {new Date().getFullYear()} CareCentral</span>
          </div>
          <nav className="flex items-center gap-5">
            <Link to="/legal#terminos" className="hover:text-foreground">
              Términos
            </Link>
            <Link to="/legal#privacidad" className="hover:text-foreground">
              Privacidad
            </Link>
            <Link to="/login" className="hover:text-foreground">
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}