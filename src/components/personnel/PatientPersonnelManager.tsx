import { useState } from "react";
import {
  useMyAccesses,
  useAllAccesses,
  useGrantAccess,
  useRevokeAccess,
  usePersonnelByRole,
  useAllPatients,
  type AppRole,
} from "@/hooks/usePatientPersonnel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, UserCheck, Search } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ROLE_OPTIONS: { value: AppRole | "todos"; label: string }[] = [
  { value: "medico", label: "Médico" },
  { value: "enfermero", label: "Enfermero" },
  { value: "laboratorio", label: "Laboratorio" },
  { value: "farmacia", label: "Farmacia" },
  { value: "broker", label: "Broker" },
  { value: "todos", label: "Todos los perfiles" },
];

const ROLE_LABEL: Record<string, string> = {
  medico: "Médico",
  enfermero: "Enfermero",
  laboratorio: "Laboratorio",
  farmacia: "Farmacia",
  broker: "Broker",
  admin: "Admin",
  paciente: "Paciente",
};

interface Props {
  mode: "patient" | "admin";
}

export function PatientPersonnelManager({ mode }: Props) {
  const isAdmin = mode === "admin";
  const myAccesses = useMyAccesses();
  const allAccesses = useAllAccesses();
  const list = isAdmin ? allAccesses.data ?? [] : myAccesses.data ?? [];
  const isLoading = isAdmin ? allAccesses.isLoading : myAccesses.isLoading;

  const [filterRole, setFilterRole] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  const filtered = list.filter((r) => {
    if (filterRole !== "all" && r.personnel_role !== filterRole) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        r.patient_name?.toLowerCase().includes(s) ||
        r.personnel_name?.toLowerCase().includes(s) ||
        r.patient_email?.toLowerCase().includes(s) ||
        r.personnel_email?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const revoke = useRevokeAccess();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            {isAdmin ? "Accesos Paciente ↔ Personal (admin)" : "Mis accesos otorgados"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Gestiona qué personal de salud tiene acceso a cada paciente."
              : "Personal médico que tiene acceso a tu información (agenda, recetas, estudios, registros)."}
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Dar acceso
            </Button>
          </DialogTrigger>
          <GrantAccessDialog
            mode={mode}
            onClose={() => setOpenDialog(false)}
          />
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {ROLE_OPTIONS.filter((o) => o.value !== "todos").map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {list.length === 0 ? "Sin accesos otorgados aún." : "Sin resultados."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && <TableHead>Paciente</TableHead>}
                <TableHead>Tipo</TableHead>
                <TableHead>Personal</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Otorgado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  {isAdmin && (
                    <TableCell>
                      <div className="font-medium">{r.patient_name}</div>
                      <div className="text-xs text-muted-foreground">{r.patient_email}</div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="secondary">{ROLE_LABEL[r.personnel_role] ?? r.personnel_role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.personnel_name}</div>
                    <div className="text-xs text-muted-foreground">{r.personnel_email}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {r.notes ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(r.created_at), "dd MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => revoke.mutate(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function GrantAccessDialog({ mode, onClose }: { mode: "patient" | "admin"; onClose: () => void }) {
  const isAdmin = mode === "admin";
  const [patientId, setPatientId] = useState<string>("");
  const [roleType, setRoleType] = useState<AppRole | "todos" | "">("");
  const [personnelId, setPersonnelId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const { data: patients = [] } = useAllPatients();
  const { data: personnel = [] } = usePersonnelByRole(roleType || null);
  const grant = useGrantAccess();

  const handleSubmit = async () => {
    if (!roleType || !personnelId) return;
    if (isAdmin && !patientId) return;

    if (roleType === "todos") {
      const role = personnel.find((p) => p.user_id === personnelId);
      // For "todos", we still need a specific role — pull it from user_roles for that user
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: ur } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", personnelId)
        .in("role", ["medico", "enfermero", "laboratorio", "farmacia", "broker"]);
      const roles = (ur ?? []).map((r) => r.role as AppRole);
      for (const r of roles) {
        await grant.mutateAsync({
          patient_id: isAdmin ? patientId : "__self__",
          personnel_id: personnelId,
          personnel_role: r,
          notes: notes || null,
        }).catch(() => {});
      }
    } else {
      await grant.mutateAsync({
        patient_id: isAdmin ? patientId : "__self__",
        personnel_id: personnelId,
        personnel_role: roleType as AppRole,
        notes: notes || null,
      });
    }
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Otorgar acceso a personal</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        {isAdmin && (
          <div className="space-y-1.5">
            <Label>Paciente</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona paciente" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {patients.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.display} {p.email && `· ${p.email}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Tipo de personal</Label>
          <Select value={roleType} onValueChange={(v) => { setRoleType(v as any); setPersonnelId(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tipo" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Personal asignado</Label>
          <Select value={personnelId} onValueChange={setPersonnelId} disabled={!roleType}>
            <SelectTrigger>
              <SelectValue placeholder={roleType ? "Selecciona personal" : "Primero elige el tipo"} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {personnel.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">Sin personal disponible.</div>
              ) : (
                personnel.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.display} {p.email && `· ${p.email}`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Notas (opcional)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Médico de cabecera" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          disabled={grant.isPending || !roleType || !personnelId || (isAdmin && !patientId)}
        >
          Otorgar acceso
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}