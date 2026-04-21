import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEstudios } from "@/hooks/useEstudios";
import { EstudioCard } from "@/components/estudios/EstudioCard";
import { EstudioForm } from "@/components/estudios/EstudioForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Estudios() {
  const { user, roles } = useAuth();
  const isPaciente = roles.includes("paciente") && !roles.includes("medico") && !roles.includes("admin");
  const isMedico = roles.includes("medico");
  const isAdmin = roles.includes("admin");
  const canCreate = isMedico || isAdmin || roles.includes("broker");

  const filters: any = {};
  if (isPaciente) filters.patientId = user?.id;
  else if (isMedico && !isAdmin) filters.doctorId = user?.id;

  const { data: estudios = [], isLoading } = useEstudios(filters);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [tab, setTab] = useState("solicitado");
  const [q, setQ] = useState("");

  const groups: Record<string, any[]> = { solicitado: [], en_proceso: [], completado: [], cancelado: [] };
  for (const e of estudios) {
    if (q && !`${e.tipo_estudio} ${e.descripcion ?? ""}`.toLowerCase().includes(q.toLowerCase())) continue;
    (groups[e.estado] ??= []).push(e);
  }

  return (
    <div className="container py-6 space-y-4 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Estudios Médicos</h1>
          <p className="text-sm text-muted-foreground">
            {isPaciente ? "Tus estudios solicitados y resultados" : "Gestión de estudios"}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Nuevo estudio
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar estudio..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="solicitado">Solicitados ({groups.solicitado.length})</TabsTrigger>
          <TabsTrigger value="en_proceso">En proceso ({groups.en_proceso.length})</TabsTrigger>
          <TabsTrigger value="completado">Completados ({groups.completado.length})</TabsTrigger>
          <TabsTrigger value="cancelado">Cancelados ({groups.cancelado.length})</TabsTrigger>
        </TabsList>
        {Object.entries(groups).map(([k, items]) => (
          <TabsContent key={k} value={k} className="mt-4">
            {isLoading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">Sin estudios.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((e) => (
                  <EstudioCard key={e.id} estudio={e} onEdit={canCreate ? (ee) => { setEditing(ee); setOpen(true); } : undefined} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {canCreate && (
        <EstudioForm open={open} onOpenChange={setOpen} initial={editing} />
      )}
    </div>
  );
}
