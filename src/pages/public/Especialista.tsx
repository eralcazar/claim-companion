import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { CareCentralLogo } from "@/components/brand/CareCentralLogo";
import {
  ArrowLeft,
  Star,
  MapPin,
  Video,
  Home,
  ShieldCheck,
  Stethoscope,
  Phone,
  MessageCircle,
  Globe,
  BadgeCheck,
  Languages,
  Calendar,
} from "lucide-react";
import { useProfessionalBySlug, useProfessionalReviews } from "@/hooks/useMarketplace";

function money(cents: number | null | undefined) {
  if (!cents && cents !== 0) return null;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= Math.round(value) ? "fill-accent text-accent" : "text-muted-foreground/40"
          }`}
        />
      ))}
    </div>
  );
}

export default function Especialista() {
  const { slug } = useParams<{ slug: string }>();
  const { data: pro, isLoading } = useProfessionalBySlug(slug);
  const { data: reviews = [] } = useProfessionalReviews(pro?.id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="mt-4 h-96 rounded-3xl" />
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="font-heading text-2xl font-bold">Perfil no encontrado</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Este especialista no está publicado o el enlace es incorrecto.
        </p>
        <Button asChild className="mt-6 rounded-2xl">
          <Link to="/buscar">Volver a la búsqueda</Link>
        </Button>
      </div>
    );
  }

  const nombreCompleto = `${pro.titulo ? pro.titulo + " " : ""}${pro.display_name}`;
  const mainSpec = pro.professional_specialties?.[0]?.specialty;
  const specs = (pro.professional_specialties ?? []).map((x: any) => x.specialty).filter(Boolean);
  const locations = pro.professional_locations ?? [];
  const precio = money(pro.precio_consulta_centavos);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{`${nombreCompleto} · ${mainSpec?.nombre ?? "Especialista"} · CareCentral`}</title>
        <meta
          name="description"
          content={
            pro.bio?.slice(0, 155) ??
            `Reserva consulta con ${nombreCompleto}${mainSpec ? `, ${mainSpec.nombre}` : ""}. Reseñas verificadas y precio transparente en CareCentral.`
          }
        />
        <link rel="canonical" href={`https://carecentral.live/especialista/${pro.slug}`} />
        <meta property="og:title" content={`${nombreCompleto} en CareCentral`} />
        <meta
          property="og:url"
          content={`https://carecentral.live/especialista/${pro.slug}`}
        />
        <meta property="og:type" content="profile" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Physician",
            name: nombreCompleto,
            image: pro.foto_url ?? undefined,
            medicalSpecialty: mainSpec?.nombre,
            aggregateRating:
              pro.rating_count > 0
                ? {
                    "@type": "AggregateRating",
                    ratingValue: pro.rating_avg,
                    reviewCount: pro.rating_count,
                  }
                : undefined,
            address: locations.map((l: any) => ({
              "@type": "PostalAddress",
              streetAddress: l.direccion,
              addressLocality: l.ciudad,
              addressRegion: l.estado,
              postalCode: l.cp,
              addressCountry: l.pais,
            })),
          })}
        </script>
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/buscar" className="inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" />
            <CareCentralLogo size={28} withText />
          </Link>
          <Button asChild size="sm" className="rounded-2xl">
            <Link to="/login">Reservar</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Card principal */}
        <Card className="overflow-hidden rounded-3xl border-border/60">
          <div className="flex flex-col gap-6 p-6 sm:flex-row">
            <div className="flex h-28 w-28 flex-none items-center justify-center overflow-hidden rounded-3xl bg-primary/10">
              {pro.foto_url ? (
                <img
                  src={pro.foto_url}
                  alt={nombreCompleto}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Stethoscope className="h-12 w-12 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-bold sm:text-3xl">{nombreCompleto}</h1>
                {pro.verificado && (
                  <Badge variant="secondary" className="rounded-full">
                    <BadgeCheck className="mr-1 h-3.5 w-3.5 text-primary" /> Verificado
                  </Badge>
                )}
              </div>
              {mainSpec && (
                <p className="mt-1 text-sm text-muted-foreground">{mainSpec.nombre}</p>
              )}
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Stars value={pro.rating_avg} />
                <span className="font-medium">{pro.rating_avg.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  · {pro.rating_count} reseña{pro.rating_count === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {pro.acepta_video && (
                  <Badge variant="secondary" className="rounded-full">
                    <Video className="mr-1 h-3 w-3" /> Video consulta
                  </Badge>
                )}
                {pro.acepta_domicilio && (
                  <Badge variant="secondary" className="rounded-full">
                    <Home className="mr-1 h-3 w-3" /> Domicilio
                  </Badge>
                )}
                {pro.acepta_presencial && (
                  <Badge variant="secondary" className="rounded-full">
                    Presencial
                  </Badge>
                )}
              </div>

              {precio && (
                <p className="mt-3 text-lg font-heading font-bold text-primary">
                  Desde {precio}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    por consulta
                  </span>
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="lg" className="rounded-2xl">
                  <Link to="/login">
                    <Calendar className="mr-2 h-4 w-4" /> Reservar cita
                  </Link>
                </Button>
                {pro.whatsapp_publico && (
                  <Button asChild size="lg" variant="outline" className="rounded-2xl">
                    <a
                      href={`https://wa.me/${pro.whatsapp_publico.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                )}
                {pro.telefono_publico && (
                  <Button asChild size="lg" variant="outline" className="rounded-2xl">
                    <a href={`tel:${pro.telefono_publico}`}>
                      <Phone className="mr-2 h-4 w-4" /> Llamar
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Bio + specs */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {pro.bio && (
              <Card className="rounded-3xl border-border/60">
                <CardContent className="p-6">
                  <h2 className="font-heading text-lg font-semibold">Acerca del profesional</h2>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {pro.bio}
                  </p>
                  {pro.anos_experiencia && (
                    <p className="mt-3 text-sm">
                      <span className="font-medium">{pro.anos_experiencia} años</span> de
                      experiencia clínica.
                    </p>
                  )}
                  {pro.cedula_profesional && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cédula profesional: {pro.cedula_profesional}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {locations.length > 0 && (
              <Card className="rounded-3xl border-border/60">
                <CardContent className="p-6">
                  <h2 className="font-heading text-lg font-semibold">Consultorios</h2>
                  <div className="mt-3 space-y-3">
                    {locations.map((l: any) => (
                      <div
                        key={l.id}
                        className="rounded-2xl border border-border/50 bg-muted/20 p-4"
                      >
                        <p className="flex items-center gap-2 font-medium">
                          <MapPin className="h-4 w-4 text-primary" /> {l.nombre}
                          {l.es_principal && (
                            <Badge variant="outline" className="rounded-full text-[10px]">
                              Principal
                            </Badge>
                          )}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {l.direccion}, {l.ciudad}
                          {l.estado ? `, ${l.estado}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reseñas */}
            <Card className="rounded-3xl border-border/60">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-semibold">Reseñas verificadas</h2>
                  <Badge variant="secondary" className="rounded-full">
                    <ShieldCheck className="mr-1 h-3 w-3 text-primary" /> 100% verificadas
                  </Badge>
                </div>
                {reviews.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Aún no hay reseñas publicadas.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {reviews.map((r: any) => (
                      <div
                        key={r.id}
                        className="rounded-2xl border border-border/50 bg-muted/10 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <Stars value={r.rating} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString("es-MX")}
                          </span>
                        </div>
                        {r.comentario && (
                          <p className="mt-2 text-sm">{r.comentario}</p>
                        )}
                        {r.respuesta_profesional && (
                          <div className="mt-3 rounded-2xl bg-primary/5 p-3 text-xs">
                            <p className="font-medium text-primary">
                              Respuesta del profesional
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {r.respuesta_profesional}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Aside */}
          <div className="space-y-4">
            <Card className="rounded-3xl border-border/60">
              <CardContent className="space-y-3 p-6 text-sm">
                <h3 className="font-heading text-base font-semibold">Datos rápidos</h3>
                {specs.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Especialidades</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {specs.map((s: any) => (
                        <Badge key={s.id} variant="outline" className="rounded-full">
                          {s.nombre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {pro.idiomas?.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
                      <Languages className="h-3 w-3" /> Idiomas
                    </p>
                    <p className="mt-1">{pro.idiomas.join(", ")}</p>
                  </div>
                )}
                {pro.seguros_aceptados?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Seguros aceptados</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {pro.seguros_aceptados.map((s: string) => (
                        <Badge key={s} variant="secondary" className="rounded-full">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {pro.website && (
                  <a
                    href={pro.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" /> Sitio web
                  </a>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-primary/30 bg-primary/5">
              <CardContent className="space-y-2 p-6 text-sm">
                <p className="font-heading text-base font-semibold text-primary">
                  Con CareCentral obtienes más
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>✓ Expediente clínico firmado y verificable</li>
                  <li>✓ Recordatorios y seguimiento continuo</li>
                  <li>✓ Receta y estudios digitales inmediatos</li>
                  <li>✓ Trámite de reembolso con tu seguro pre-llenado</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}