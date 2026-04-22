import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PatientView() {
  const { id } = useParams<{ id: string }>();

  const { data: patient } = useQuery({
    queryKey: ["patient-profile", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: appts } = useQuery({
    queryKey: ["patient-view-appts", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", id!)
        .order("appointment_date", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: recetas } = useQuery({
    queryKey: ["patient-view-recetas", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("recetas")
        .select("*, receta_items(*)")
        .eq("patient_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: estudios } = useQuery({
    queryKey: ["patient-view-estudios", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("estudios_solicitados")
        .select("*, estudio_items(*)")
        .eq("patient_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: records } = useQuery({
    queryKey: ["patient-view-records", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("medical_records")
        .select("*")
        .eq("user_id", id!)
        .order("record_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: meds } = useQuery({
    queryKey: ["patient-view-meds", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", id!)
        .order("start_date", { ascending: false });
      return data ?? [];
    },
  });

  const patientName =
    (patient as any)?.full_name?.trim() ||
    [(patient as any)?.first_name, (patient as any)?.paternal_surname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    (patient as any)?.email ||
    "Paciente";

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {patientName}
          </CardTitle>
          {(patient as any)?.email && (
            <p className="text-sm text-muted-foreground">{(patient as any).email}</p>
          )}
          {(patient as any)?.phone && (
            <p className="text-sm text-muted-foreground">{(patient as any).phone}</p>
          )}
        </CardHeader>
      </Card>

      <Tabs defaultValue="agenda">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="agenda">Agenda ({appts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="recetas">Recetas ({recetas?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="estudios">Estudios ({estudios?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="medicamentos">Medicamentos ({meds?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="registros">Registros ({records?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="space-y-2 mt-3">
          {(appts ?? []).map((a: any) => (
            <Card key={a.id}>
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium capitalize">{a.appointment_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(a.appointment_date), "PPP p", { locale: es })}
                    </p>
                  </div>
                  {a.address && <p className="text-xs text-muted-foreground max-w-[40%] truncate">{a.address}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="recetas" className="space-y-2 mt-3">
          {(recetas ?? []).map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant={r.estado === "activa" ? "default" : "secondary"}>{r.estado}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(r.created_at), "dd MMM yyyy", { locale: es })}
                  </span>
                </div>
                <p className="text-sm">{r.medicamento_nombre ?? `${r.receta_items?.length ?? 0} medicamentos`}</p>
                {r.indicacion && <p className="text-xs text-muted-foreground">{r.indicacion}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="estudios" className="space-y-2 mt-3">
          {(estudios ?? []).map((e: any) => (
            <Card key={e.id}>
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge>{e.estado}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(e.created_at), "dd MMM yyyy", { locale: es })}
                  </span>
                </div>
                <p className="text-sm font-medium">{e.tipo_estudio ?? "Estudio"}</p>
                {e.indicacion && <p className="text-xs text-muted-foreground">{e.indicacion}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="medicamentos" className="space-y-2 mt-3">
          {(meds ?? []).map((m: any) => (
            <Card key={m.id}>
              <CardContent className="p-3">
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.dosage} · {m.frequency}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="registros" className="space-y-2 mt-3">
          {(records ?? []).map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <p className="text-sm">{r.description ?? r.record_type}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(r.record_date), "PPP", { locale: es })}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}