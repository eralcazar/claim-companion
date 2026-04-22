import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRecetas } from "@/hooks/useRecetas";
import { RecetaCard } from "@/components/recetas/RecetaCard";
import { RecetaForm } from "@/components/recetas/RecetaForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Recetas() {
  const { user, roles } = useAuth();
  const isPaciente = roles.includes("paciente") && !roles.includes("medico") && !roles.includes("admin");
  const isMedico = roles.includes("medico");
  const isAdmin = roles.includes("admin");
  const canCreate = isMedico || isAdmin || roles.includes("broker");

  const filters: any = {};
  if (isPaciente) filters.patientId = user?.id;
  else if (isMedico && !isAdmin) filters.doctorId = user?.id;

  const { data: recetas = [], isLoading } = useRecetas(filters);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [estado, setEstado] = useState<string>("all");
  const [q, setQ] = useState("");

  const filtered = recetas.filter((r) => {
    if (estado !== "all" && r.estado !== estado) return false;
    if (q) {
      const needle = q.toLowerCase();
      const items: any[] = Array.isArray(r.items) && r.items.length > 0
        ? r.items
        : [{ medicamento_nombre: r.medicamento_nombre, marca_comercial: r.marca_comercial }];
      const matches = items.some((it) =>
        `${it.medicamento_nombre ?? ""} ${it.marca_comercial ?? ""}`.toLowerCase().includes(needle)
      );
      if (!matches) return false;
    }
    return true;
  });

  return (
    <div className="container py-6 space-y-4 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recetas Médicas</h1>
          <p className="text-sm text-muted-foreground">
            {isPaciente ? "Tus recetas activas y pasadas" : "Gestión de recetas"}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Nueva receta
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar medicamento..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="activa">Activas</SelectItem>
            <SelectItem value="completada">Completadas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">No hay recetas para mostrar.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => (
            <RecetaCard key={r.id} receta={r} onEdit={canCreate ? (rr) => { setEditing(rr); setOpen(true); } : undefined} />
          ))}
        </div>
      )}

      {canCreate && (
        <RecetaForm open={open} onOpenChange={setOpen} initial={editing} />
      )}
    </div>
  );
}
