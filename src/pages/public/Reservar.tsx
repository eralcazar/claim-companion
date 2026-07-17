import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CareCentralLogo } from "@/components/brand/CareCentralLogo";
import { ArrowLeft, Calendar, MapPin, Video, Home, Stethoscope, CheckCircle2 } from "lucide-react";
import { useProfessionalBySlug } from "@/hooks/useMarketplace";
import { useProfessionalSlots, useReserveSlot, type ProSlot } from "@/hooks/useAvailability";
import { useAuth } from "@/contexts/AuthContext";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Reservar() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: pro, isLoading } = useProfessionalBySlug(slug);

  const today = new Date();
  const to = new Date();
  to.setDate(today.getDate() + 14);

  const { data: slots = [], isLoading: loadingSlots } = useProfessionalSlots(
    pro?.id,
    iso(today),
    iso(to),
  );
  const reserve = useReserveSlot();

  const [selected, setSelected] = useState<ProSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, ProSlot[]>();
    for (const s of slots) {
      const key = s.slot_start.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [slots]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="font-heading text-2xl font-bold">Perfil no encontrado</p>
        <Button asChild className="mt-4 rounded-2xl">
          <Link to="/buscar">Volver a la búsqueda</Link>
        </Button>
      </div>
    );
  }

  const nombreCompleto = `${pro.titulo ? pro.titulo + " " : ""}${pro.display_name}`;

  const handleReserve = () => {
    if (!selected) return;
    if (!user) {
      sessionStorage.setItem(
        "postLoginRedirect",
        `/reservar/${pro.slug}`,
      );
      navigate("/login");
      return;
    }
    reserve.mutate(
      {
        professionalUserId: pro.user_id,
        slotStart: selected.slot_start,
        modalidad: selected.modalidad,
        notes,
      },
      { onSuccess: () => setConfirmed(true) },
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{`Reservar cita · ${nombreCompleto} · CareCentral`}</title>
        <meta name="description" content={`Reserva una cita con ${nombreCompleto} en CareCentral.`} />
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to={`/especialista/${pro.slug}`} className="inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" />
            <CareCentralLogo size={28} withText />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {confirmed ? (
          <Card className="rounded-3xl border-primary/30">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <h1 className="mt-4 font-heading text-2xl font-bold">Cita confirmada</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Reservaste con {nombreCompleto} el{" "}
                {selected &&
                  format(new Date(selected.slot_start), "PPP 'a las' p", { locale: es })}
                .
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button asChild className="rounded-2xl">
                  <Link to="/agenda">Ver mi agenda</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl">
                  <Link to={`/especialista/${pro.slug}`}>Volver al perfil</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden rounded-3xl border-border/60">
              <div className="flex items-center gap-4 p-5">
                <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
                  {pro.foto_url ? (
                    <img src={pro.foto_url} alt={nombreCompleto} className="h-full w-full object-cover" />
                  ) : (
                    <Stethoscope className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="font-heading text-xl font-bold">{nombreCompleto}</h1>
                  <p className="text-sm text-muted-foreground">
                    {pro.professional_specialties?.[0]?.specialty?.nombre}
                  </p>
                </div>
              </div>
            </Card>

            <h2 className="mt-8 font-heading text-lg font-semibold">
              <Calendar className="mr-2 inline h-4 w-4 text-primary" />
              Elige un horario
            </h2>

            {loadingSlots ? (
              <Skeleton className="mt-4 h-40 rounded-3xl" />
            ) : grouped.length === 0 ? (
              <Card className="mt-4 rounded-3xl border-border/60">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Este especialista no tiene horarios disponibles en los próximos 14 días.
                </CardContent>
              </Card>
            ) : (
              <div className="mt-4 space-y-4">
                {grouped.map(([day, list]) => (
                  <Card key={day} className="rounded-3xl border-border/60">
                    <CardContent className="p-4">
                      <p className="mb-2 text-sm font-medium capitalize">
                        {format(new Date(day + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {list.map((s) => {
                          const isSel =
                            selected?.slot_start === s.slot_start &&
                            selected?.modalidad === s.modalidad;
                          return (
                            <button
                              key={s.slot_start + s.modalidad}
                              type="button"
                              onClick={() => setSelected(s)}
                              className={`inline-flex items-center gap-1 rounded-2xl border px-3 py-2 text-sm transition ${
                                isSel
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border/60 hover:bg-muted"
                              }`}
                            >
                              {s.modalidad === "video" ? (
                                <Video className="h-3 w-3" />
                              ) : s.modalidad === "domicilio" ? (
                                <Home className="h-3 w-3" />
                              ) : (
                                <MapPin className="h-3 w-3" />
                              )}
                              {format(new Date(s.slot_start), "p", { locale: es })}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selected && (
              <Card className="mt-6 rounded-3xl border-primary/40 bg-primary/5">
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      {format(new Date(selected.slot_start), "PPP 'a las' p", { locale: es })}
                    </Badge>
                    <Badge variant="outline" className="rounded-full capitalize">
                      {selected.modalidad}
                    </Badge>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Motivo de la consulta (opcional)
                    </label>
                    <Textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe brevemente el motivo"
                    />
                  </div>
                  <Button
                    size="lg"
                    className="w-full rounded-2xl"
                    onClick={handleReserve}
                    disabled={reserve.isPending}
                  >
                    {reserve.isPending
                      ? "Reservando..."
                      : user
                      ? "Confirmar reserva"
                      : "Iniciar sesión y reservar"}
                  </Button>
                  {!user && (
                    <p className="text-center text-xs text-muted-foreground">
                      Necesitas una cuenta CareCentral gratuita para reservar.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}