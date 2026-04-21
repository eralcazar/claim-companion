import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTendenciasPaciente } from "@/hooks/useTendencias";
import { usePatients } from "@/hooks/usePatients";
import { IndicadorTrendChart } from "@/components/tendencias/IndicadorTrendChart";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Tendencias() {
  const { user, roles } = useAuth();
  const isPaciente =
    roles.includes("paciente") && !roles.includes("medico") && !roles.includes("admin") && !roles.includes("broker");
  const canPickPatient = roles.includes("medico") || roles.includes("admin") || roles.includes("broker");

  const { data: patients = [], isLoading: loadingPatients } = usePatients();
  const [selectedPatient, setSelectedPatient] = useState<string | undefined>(
    isPaciente ? user?.id : undefined,
  );
  const targetId = isPaciente ? user?.id : selectedPatient;

  const { data: indicadores = [], isLoading } = useTendenciasPaciente(targetId);
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      indicadores.filter((i) =>
        q ? i.nombre.toLowerCase().includes(q.toLowerCase()) : true,
      ),
    [indicadores, q],
  );

  return (
    <div className="container py-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tendencias de indicadores</h1>
          <p className="text-sm text-muted-foreground">
            Evolución a lo largo del tiempo de los indicadores extraídos de tus estudios.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar indicador (ej. glucosa, hemoglobina)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        {canPickPatient && (
          <Select
            value={selectedPatient ?? ""}
            onValueChange={(v) => setSelectedPatient(v || undefined)}
          >
            <SelectTrigger className="w-full sm:w-[260px]">
              <SelectValue placeholder={loadingPatients ? "Cargando..." : "Selecciona paciente"} />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!targetId ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Selecciona un paciente para ver sus tendencias.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {indicadores.length === 0
              ? "Aún no hay indicadores capturados. Sube resultados de estudios y extrae los indicadores con IA para ver gráficos."
              : "Ningún indicador coincide con tu búsqueda."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((ind) => (
            <IndicadorTrendChart key={ind.nombre} indicador={ind} />
          ))}
        </div>
      )}
    </div>
  );
}