import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CareCentralLogo } from "@/components/brand/CareCentralLogo";
import {
  FileText,
  BellRing,
  ScanLine,
  Sparkles,
  ShieldCheck,
  Activity,
  Users,
  Briefcase,
  ClipboardList,
  ArrowRight,
  Check,
  Menu,
  HeartPulse,
  Stethoscope,
  FileCheck2,
} from "lucide-react";
import kariAvatar from "@/assets/kari-avatar.png";

const navLinks = [
  { id: "pacientes", label: "Pacientes" },
  { id: "brokers", label: "Brokers" },
  { id: "como-funciona", label: "Cómo funciona" },
];

const features = [
  { icon: FileText, title: "Expediente digital familiar", desc: "Toda la información médica de tu familia centralizada." },
  { icon: BellRing, title: "Recordatorios inteligentes", desc: "Medicamentos, citas y controles a tiempo." },
  { icon: ScanLine, title: "Solicitudes con OCR", desc: "Sube facturas y CareCentral llena los formularios." },
  { icon: Sparkles, title: "Asistente IA Kari", desc: "Tu asistente personal para dudas y trámites." },
];

const patientBenefits = [
  "Expediente digital de toda la familia",
  "Recordatorios de medicamentos y citas",
  "Captura de recetas y estudios con OCR",
  "Asistente Kari para resolver dudas",
  "Indicadores: presión, glucosa, oxigenación, temperatura",
];

const brokerBenefits = [
  "Asignación masiva de pacientes vía CSV",
  "Visibilidad de pólizas y solicitudes por cliente",
  "Seguimiento del estado de cada solicitud",
  "Notificaciones automáticas a tus clientes",
];

const steps = [
  { n: "1", title: "Regístrate gratis", desc: "Crea tu cuenta con Google o Apple en segundos." },
  { n: "2", title: "Conecta tu información", desc: "Sube pólizas, recetas y estudios. Kari los organiza por ti." },
  { n: "3", title: "Gestiona tu salud", desc: "Recordatorios, solicitudes y expediente, todo en un solo lugar." },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavClick = (id: string) => {
    setMenuOpen(false);
    setTimeout(() => scrollToId(id), 50);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center"
            aria-label="Inicio"
          >
            <CareCentralLogo size={32} withText />
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollToId(l.id)}
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </button>
            ))}
            <Button asChild className="ml-2 rounded-2xl">
              <Link to="/login">Iniciar sesión</Link>
            </Button>
          </nav>

          {/* Mobile nav */}
          <div className="flex items-center gap-2 md:hidden">
            <Button asChild size="sm" className="rounded-2xl">
              <Link to="/login">Entrar</Link>
            </Button>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <CareCentralLogo size={28} withText />
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1">
                  {navLinks.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleNavClick(l.id)}
                      className="rounded-2xl px-3 py-3 text-left text-base font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {l.label}
                    </button>
                  ))}
                </nav>
                <Button asChild className="mt-6 h-12 w-full rounded-2xl">
                  <Link to="/login" onClick={() => setMenuOpen(false)}>
                    Iniciar sesión
                  </Link>
                </Button>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" aria-hidden />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-accent/30 blur-3xl" aria-hidden />

        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:py-14 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-in text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Salud inteligente para tu familia
            </span>
            <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Tu salud, <span className="text-primary">en un solo lugar</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              CareCentral reúne tu expediente digital, recordatorios, pólizas y solicitudes médicas.
              Con Kari, tu asistente IA, todo es más simple.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <Button asChild size="lg" className="h-12 w-full rounded-2xl px-6 text-base shadow-lg sm:w-auto">
                <Link to="/login">
                  Iniciar sesión
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-2xl px-6 text-base sm:w-auto"
                onClick={() => scrollToId("pacientes")}
              >
                Conocer más
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground lg:justify-start">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Datos cifrados · Comienza gratis con 5 OCR al mes
            </div>
          </div>

          <div className="relative mx-auto h-56 w-52 sm:h-96 sm:w-80 lg:h-[28rem] lg:w-96 animate-fade-in">
            <img
              src={kariAvatar}
              alt="Kari, tu asistente médica de CareCentral"
              className="mx-auto h-full w-auto object-contain drop-shadow-2xl"
            />
            <div className="absolute right-0 top-6 z-10 rounded-2xl rounded-bl-sm bg-foreground px-3.5 py-2 text-xs font-medium text-background shadow-xl">
              ¡Hola! Soy Kari 👋
              <span className="absolute -left-1 bottom-2 h-3 w-3 rotate-45 bg-foreground" />
            </div>
          </div>
        </div>
      </section>

      {/* Pacientes */}
      <section id="pacientes" className="scroll-mt-20 py-16 lg:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Users className="h-3.5 w-3.5" />
              Para Pacientes y Familias
            </span>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Tu salud y la de tu familia, <span className="text-primary">organizadas</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              Olvídate de carpetas con papeles y recordatorios sueltos. CareCentral guarda todo lo importante y te avisa cuando lo necesitas.
            </p>
            <ul className="mt-6 space-y-3">
              {patientBenefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-foreground">{b}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-8 h-12 rounded-2xl px-6">
              <Link to="/login">
                Crear cuenta gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="relative">
            <div className="glass-card rounded-3xl p-5 shadow-xl">
              <div className="flex items-center gap-3 border-b border-border/50 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                  <HeartPulse className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Resumen de hoy</p>
                  <p className="text-xs text-muted-foreground">María González</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: "Presión", value: "118/76", unit: "mmHg" },
                  { label: "Glucosa", value: "94", unit: "mg/dL" },
                  { label: "SpO₂", value: "98%", unit: "Sat." },
                  { label: "Temp.", value: "36.6°", unit: "C" },
                ].map((m) => (
                  <div key={m.label} className="min-w-0 rounded-2xl border border-border/50 bg-card p-3">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="mt-1 truncate font-heading text-lg font-bold text-foreground">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.unit}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-primary/10 p-3">
                <BellRing className="h-4 w-4 flex-none text-primary" />
                <div className="text-xs">
                  <p className="font-medium text-foreground">Losartán 50mg</p>
                  <p className="text-muted-foreground">Próxima dosis a las 8:00 PM</p>
                </div>
              </div>
            </div>
            <div
              className="absolute -inset-4 -z-10 rounded-3xl blur-3xl opacity-40"
              style={{ background: "var(--gradient-hero)" }}
              aria-hidden
            />
          </div>
        </div>
      </section>

      {/* Brokers */}
      <section id="brokers" className="scroll-mt-20 bg-muted/30 py-16 lg:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Asegurados activos</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  142
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { name: "Ana Rodríguez", policy: "Salud Total", status: "Aprobado", tone: "ok" },
                  { name: "Carlos Méndez", policy: "Plus 360", status: "En revisión", tone: "warn" },
                  { name: "Lucía Pérez", policy: "Familia+", status: "Aprobado", tone: "ok" },
                  { name: "Jorge Salas", policy: "Salud Total", status: "Pendiente doc", tone: "warn" },
                ].map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{r.policy}</p>
                    </div>
                    <span
                      className={
                        r.tone === "ok"
                          ? "flex-none rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                          : "flex-none rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-foreground"
                      }
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Briefcase className="h-3.5 w-3.5" />
              Para Brokers de seguros
            </span>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Gestiona a tus asegurados <span className="text-primary">desde un solo panel</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              Centraliza pólizas, solicitudes y comunicación con tus clientes. Menos llamadas, más tiempo para crecer tu cartera.
            </p>
            <ul className="mt-6 space-y-3">
              {brokerBenefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-foreground">{b}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-8 h-12 rounded-2xl px-6">
              <Link to="/login">
                Soy broker, quiero acceso
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features generales */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Todo en una sola app
          </h2>
          <p className="mt-3 text-muted-foreground">
            Diseñada para que cada actor del cuidado médico tenga lo que necesita.
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
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          También para:
          {[
            { icon: Stethoscope, label: "Médicos" },
            { icon: Activity, label: "Enfermería" },
            { icon: FileCheck2, label: "Laboratorios" },
            { icon: ClipboardList, label: "Farmacias" },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1"
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-20 bg-muted/30 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4">
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
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20">
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