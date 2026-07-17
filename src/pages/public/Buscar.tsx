import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CareCentralLogo } from "@/components/brand/CareCentralLogo";
import {
  Search,
  MapPin,
  Star,
  Video,
  Home,
  ShieldCheck,
  ArrowLeft,
  Stethoscope,
} from "lucide-react";
import { useSearchProfessionals, useSpecialties } from "@/hooks/useMarketplace";

function formatMxn(cents: number | null) {
  if (!cents && cents !== 0) return null;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function Buscar() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const initialCiudad = params.get("ciudad") ?? "";
  const initialSpec = params.get("esp") ?? "";

  const [q, setQ] = useState(initialQ);
  const [ciudad, setCiudad] = useState(initialCiudad);
  const [specialtySlug, setSpecialtySlug] = useState(initialSpec);
  const [soloVideo, setSoloVideo] = useState(false);
  const [soloDomicilio, setSoloDomicilio] = useState(false);

  const { data: specialties = [] } = useSpecialties();
  const { data: results = [], isLoading } = useSearchProfessionals({
    q,
    ciudad,
    specialtySlug: specialtySlug || undefined,
    soloVideo,
    soloDomicilio,
  });

  const totalLabel = useMemo(() => {
    if (isLoading) return "Buscando…";
    return `${results.length} especialista${results.length === 1 ? "" : "s"} encontrado${
      results.length === 1 ? "" : "s"
    }`;
  }, [isLoading, results.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (q) next.q = q;
    if (ciudad) next.ciudad = ciudad;
    if (specialtySlug) next.esp = specialtySlug;
    setParams(next);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Buscar especialistas en salud · CareCentral</title>
        <meta
          name="description"
          content="Encuentra médicos, dentistas, nutriólogos, laboratorios y enfermería a domicilio verificados. Precio transparente y reseñas reales de pacientes."
        />
        <link rel="canonical" href="https://carecentral.live/buscar" />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <CareCentralLogo size={32} withText />
          </Link>
          <Button asChild variant="ghost" size="sm" className="rounded-2xl">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </header>

      {/* Hero de búsqueda */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 gradient-hero opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:py-12">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <h1 className="font-heading text-2xl font-bold sm:text-4xl">
            Encuentra al especialista <span className="text-primary">indicado para ti</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Médicos verificados, precios claros y reseñas 100% reales de pacientes.
          </p>

          <form
            onSubmit={submit}
            className="mt-6 grid gap-2 rounded-3xl border border-border/60 bg-card p-3 shadow-lg sm:grid-cols-[1.4fr_1fr_auto]"
          >
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                list="specialties-list"
                placeholder="Especialidad, síntoma o nombre"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-12 rounded-2xl pl-9"
              />
              <datalist id="specialties-list">
                {specialties.map((s) => (
                  <option key={s.id} value={s.nombre} />
                ))}
              </datalist>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ciudad"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className="h-12 rounded-2xl pl-9"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 rounded-2xl px-6">
              <Search className="mr-2 h-4 w-4" /> Buscar
            </Button>
          </form>

          {/* Chips de especialidades */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSpecialtySlug("")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                specialtySlug === ""
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas
            </button>
            {specialties.slice(0, 12).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSpecialtySlug(s.slug)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  specialtySlug === s.slug
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.nombre}
              </button>
            ))}
          </div>

          {/* Filtros extra */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Switch id="video" checked={soloVideo} onCheckedChange={setSoloVideo} />
              <Label htmlFor="video" className="cursor-pointer">
                <Video className="mr-1 inline h-3.5 w-3.5" /> Video consulta
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="domi" checked={soloDomicilio} onCheckedChange={setSoloDomicilio} />
              <Label htmlFor="domi" className="cursor-pointer">
                <Home className="mr-1 inline h-3.5 w-3.5" /> A domicilio
              </Label>
            </div>
          </div>
        </div>
      </section>

      {/* Resultados */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <p className="mb-4 text-sm text-muted-foreground">{totalLabel}</p>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-56 rounded-3xl" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-muted/30 p-10 text-center">
            <p className="font-medium">Aún no hay especialistas publicados con esos filtros.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Prueba con otra especialidad o ciudad. Si eres profesional de la salud,{" "}
              <Link to="/login" className="text-primary underline">
                publica tu perfil gratis
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => {
              const mainSpec = p.professional_specialties?.[0]?.specialty;
              const mainLoc =
                p.professional_locations?.find((l) => l.es_principal) ??
                p.professional_locations?.[0];
              const precio = formatMxn(p.precio_consulta_centavos);
              return (
                <Card
                  key={p.id}
                  className="group overflow-hidden rounded-3xl border-border/60 transition-shadow hover:shadow-lg"
                >
                  <Link to={`/especialista/${p.slug}`} className="block">
                    <div className="flex gap-4 p-5">
                      <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
                        {p.foto_url ? (
                          <img
                            src={p.foto_url}
                            alt={p.display_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Stethoscope className="h-7 w-7 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-heading text-base font-semibold">
                            {p.titulo ? `${p.titulo} ` : ""}
                            {p.display_name}
                          </p>
                          {p.verificado && (
                            <ShieldCheck className="h-4 w-4 flex-none text-primary" />
                          )}
                        </div>
                        {mainSpec && (
                          <p className="truncate text-sm text-muted-foreground">
                            {mainSpec.nombre}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                          <span className="font-medium text-foreground">
                            {p.rating_avg.toFixed(1)}
                          </span>
                          <span>· {p.rating_count} reseñas</span>
                        </div>
                      </div>
                    </div>
                    <CardContent className="space-y-2 border-t border-border/50 bg-muted/20 px-5 py-4 text-xs">
                      {mainLoc && (
                        <p className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" /> {mainLoc.ciudad}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {p.acepta_video && (
                          <Badge variant="secondary" className="rounded-full">
                            <Video className="mr-1 h-3 w-3" /> Video
                          </Badge>
                        )}
                        {p.acepta_domicilio && (
                          <Badge variant="secondary" className="rounded-full">
                            <Home className="mr-1 h-3 w-3" /> Domicilio
                          </Badge>
                        )}
                        {p.seguros_aceptados?.slice(0, 2).map((s) => (
                          <Badge key={s} variant="outline" className="rounded-full">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      {precio && (
                        <p className="pt-1 font-medium text-foreground">
                          Desde <span className="text-primary">{precio}</span> por consulta
                        </p>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}