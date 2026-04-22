import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useTendenciasPaciente,
  filterTendenciasByRango,
  type RangoFechas,
} from "@/hooks/useTendencias";
import { usePatients } from "@/hooks/usePatients";
import { IndicadorTrendChart } from "@/components/tendencias/IndicadorTrendChart";
import {
  IndicadorCompareChart,
  COMPARE_COLORS,
} from "@/components/tendencias/IndicadorCompareChart";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

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
  const [rangoFechas, setRangoFechas] = useState<RangoFechas>("todo");

  const filteredByRango = useMemo(
    () => filterTendenciasByRango(indicadores, rangoFechas),
    [indicadores, rangoFechas],
  );

  const filtered = useMemo(
    () =>
      filteredByRango.filter((i) =>
        q ? i.nombre.toLowerCase().includes(q.toLowerCase()) : true,
      ),
    [filteredByRango, q],
  );

  const [modo, setModo] = useState<"individual" | "comparar">("individual");
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const toggleSeleccion = (nombre: string) => {
    setSeleccionados((prev) => {
      if (prev.includes(nombre)) return prev.filter((n) => n !== nombre);
      if (prev.length >= 3) {
        toast.error("Máximo 3 indicadores");
        return prev;
      }
      return [...prev, nombre];
    });
  };

  const indicadoresComparar = useMemo(
    () =>
      seleccionados
        .map((nombre) => filteredByRango.find((i) => i.nombre === nombre))
        .filter((i): i is NonNullable<typeof i> => !!i && i.puntos.length > 0),
    [seleccionados, filteredByRango],
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

      <Tabs value={modo} onValueChange={(v) => setModo(v as "individual" | "comparar")}>
        <TabsList>
          <TabsTrigger value="individual">Vista individual</TabsTrigger>
          <TabsTrigger value="comparar">Comparar indicadores</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar indicador (ej. glucosa, hemoglobina)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8 w-full sm:w-[280px]"
          />
        </div>
        <Select
          value={rangoFechas}
          onValueChange={(v) => setRangoFechas(v as RangoFechas)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">Todo el historial</SelectItem>
            <SelectItem value="3m">Últimos 3 meses</SelectItem>
            <SelectItem value="6m">Últimos 6 meses</SelectItem>
            <SelectItem value="12m">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
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
      ) : modo === "individual" && filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {indicadores.length === 0
              ? "Aún no hay indicadores capturados. Sube resultados de estudios y extrae los indicadores con IA para ver gráficos."
              : filteredByRango.length === 0
                ? "No hay datos en el periodo seleccionado. Prueba con un rango mayor."
                : "Ningún indicador coincide con tu búsqueda."}
          </CardContent>
        </Card>
      ) : modo === "individual" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((ind) => (
            <IndicadorTrendChart key={ind.nombre} indicador={ind} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card>
            <CardContent className="py-4 space-y-2">
              <div className="text-sm font-medium mb-2">
                Selecciona indicadores ({seleccionados.length}/3)
              </div>
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No hay indicadores disponibles con los filtros actuales.
                </p>
              ) : (
                <div className="max-h-[480px] overflow-y-auto space-y-1 pr-1">
                  {filtered.map((ind) => {
                    const checked = seleccionados.includes(ind.nombre);
                    const idx = seleccionados.indexOf(ind.nombre);
                    return (
                      <label
                        key={ind.nombre}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSeleccion(ind.nombre)}
                        />
                        {checked && (
                          <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ background: COMPARE_COLORS[idx] }}
                          />
                        )}
                        <span className="flex-1 truncate">{ind.nombre}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {ind.puntos.length}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="space-y-3">
            {seleccionados.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {seleccionados.map((nombre, idx) => (
                  <span
                    key={nombre}
                    className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs border bg-background"
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: COMPARE_COLORS[idx] }}
                    />
                    {nombre}
                    <button
                      type="button"
                      onClick={() => toggleSeleccion(nombre)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Quitar ${nombre}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {indicadoresComparar.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  {seleccionados.length === 0
                    ? "Selecciona 1 a 3 indicadores para comparar."
                    : "Los indicadores seleccionados no tienen datos en el periodo elegido."}
                </CardContent>
              </Card>
            ) : (
              <IndicadorCompareChart indicadores={indicadoresComparar} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}