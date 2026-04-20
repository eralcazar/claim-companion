import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMedicoUsers } from "@/hooks/useMedicos";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MedicoEditor } from "@/components/medicos/MedicoEditor";
import { Stethoscope, Pencil } from "lucide-react";

export default function MedicosManager() {
  const { roles } = useAuth();
  const { data: medicoUsers = [], isLoading } = useMedicoUsers();
  const [search, setSearch] = useState("");
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  if (!roles.includes("admin")) return <Navigate to="/" replace />;

  const filtered = medicoUsers.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  });

  const editing = medicoUsers.find((m) => m.user_id === openUserId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Gestor de Médicos</h1>
        <p className="text-sm text-muted-foreground">
          Administra los datos profesionales de los usuarios con rol "Médico".
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <Input
          placeholder="Buscar por nombre o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isLoading && (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No se encontraron médicos.
          </p>
        )}

        <div className="space-y-2">
          {filtered.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center gap-3 border rounded-md p-3 hover:bg-muted/40"
            >
              <Stethoscope className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{m.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {m.email}
                </div>
              </div>
              <Badge variant={m.medico ? "secondary" : "outline"}>
                {m.medico ? "Configurado" : "Pendiente"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenUserId(m.user_id)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Sheet open={!!openUserId} onOpenChange={(o) => !o && setOpenUserId(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
        >
          <div className="pt-4 space-y-3">
            <h2 className="text-lg font-semibold">Editar médico</h2>
            {editing && (
              <MedicoEditor
                userId={editing.user_id}
                displayName={editing.full_name}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}