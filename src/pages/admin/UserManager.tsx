import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRolesRow } from "@/components/admin/UserRolesRow";
import { ALL_ROLES, type AppRoleLite } from "@/lib/features";
import { Search, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrokerAssignmentImportDialog } from "@/components/admin/BrokerAssignmentImportDialog";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { UserPlus } from "lucide-react";

const ROLE_LABEL: Record<AppRoleLite, string> = {
  admin: "Admin",
  broker: "Broker",
  paciente: "Paciente",
  medico: "Médico",
  enfermero: "Enfermero",
  laboratorio: "Laboratorio",
  farmacia: "Farmacia",
};

export default function UserManager() {
  const { roles, loading, user } = useAuth();
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users_with_roles"],
    queryFn: async () => {
      const [
        { data: profiles, error: pErr },
        { data: rolesData, error: rErr },
        { data: quotasData, error: qErr },
      ] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, first_name, paternal_surname, email"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("ocr_quotas").select("user_id, subscription_balance, addon_balance"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      if (qErr) throw qErr;
      const rolesByUser = new Map<string, AppRoleLite[]>();
      (rolesData ?? []).forEach((r) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role as AppRoleLite);
        rolesByUser.set(r.user_id, arr);
      });
      const quotaByUser = new Map<string, { sub: number; addon: number }>();
      (quotasData ?? []).forEach((q: any) => {
        quotaByUser.set(q.user_id, {
          sub: q.subscription_balance ?? 0,
          addon: q.addon_balance ?? 0,
        });
      });
      return (profiles ?? []).map((p) => {
        const composed = [p.first_name, p.paternal_surname].filter(Boolean).join(" ").trim();
        const q = quotaByUser.get(p.user_id) ?? { sub: 0, addon: 0 };
        return {
          user_id: p.user_id,
          full_name: p.full_name?.trim() || composed || "(sin nombre)",
          email: p.email,
          roles: rolesByUser.get(p.user_id) ?? [],
          ocr_sub: q.sub,
          ocr_addon: q.addon,
        };
      });
    },
    enabled: roles.includes("admin"),
  });

  const { data: assignments } = useQuery({
    queryKey: ["broker_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broker_patients")
        .select("broker_id, patient_id");
      if (error) throw error;
      return data ?? [];
    },
    enabled: roles.includes("admin"),
  });

  const brokers = useMemo(
    () =>
      (users ?? [])
        .filter((u) => u.roles.includes("broker"))
        .map((u) => ({ user_id: u.user_id, full_name: u.full_name })),
    [users],
  );

  const assignedBrokerByPatient = useMemo(() => {
    const m = new Map<string, string>();
    (assignments ?? []).forEach((a) => m.set(a.patient_id, a.broker_id));
    return m;
  }, [assignments]);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.full_name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const downloadTemplate = () => {
    const csv = "email_paciente,email_broker\npaciente@ejemplo.com,broker@ejemplo.com\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_asignaciones_broker.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return null;
  if (!roles.includes("admin")) return <Navigate to="/" replace />;

  const colCount = 5 + ALL_ROLES.length; // user, broker, ...roles, OCR, email, actions

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Gestor de Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Descargar plantilla
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Importar asignaciones
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Nuevo usuario
            </Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="min-w-[200px] font-bold bg-muted/30">
                    Broker asignado
                  </TableHead>
                  {ALL_ROLES.map((r) => (
                    <TableHead key={r} className="text-center w-20">{ROLE_LABEL[r]}</TableHead>
                  ))}
                  <TableHead className="text-center w-28">Escaneos OCR</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-12 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <td colSpan={colCount} className="p-6 text-center text-muted-foreground">
                      Cargando...
                    </td>
                  </TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <td colSpan={colCount} className="p-6 text-center text-muted-foreground">
                      No hay usuarios.
                    </td>
                  </TableRow>
                )}
                {filtered.map((u) => (
                  <UserRolesRow
                    key={u.user_id}
                    user={u}
                    brokers={brokers}
                    assignedBrokerId={assignedBrokerByPatient.get(u.user_id) ?? null}
                    isSelf={u.user_id === user?.id}
                    ocrSubscription={u.ocr_sub}
                    ocrAddon={u.ocr_addon}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <BrokerAssignmentImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        users={users ?? []}
      />
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}