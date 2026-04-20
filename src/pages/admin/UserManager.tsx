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
import { Search } from "lucide-react";

const ROLE_LABEL: Record<AppRoleLite, string> = {
  admin: "Admin",
  broker: "Broker",
  paciente: "Paciente",
  medico: "Médico",
};

export default function UserManager() {
  const { roles, loading } = useAuth();
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users_with_roles"],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: rolesData, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, first_name, paternal_surname, email"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const rolesByUser = new Map<string, AppRoleLite[]>();
      (rolesData ?? []).forEach((r) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role as AppRoleLite);
        rolesByUser.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p) => {
        const composed = [p.first_name, p.paternal_surname].filter(Boolean).join(" ").trim();
        return {
          user_id: p.user_id,
          full_name: p.full_name?.trim() || composed || "(sin nombre)",
          email: p.email,
          roles: rolesByUser.get(p.user_id) ?? [],
        };
      });
    },
    enabled: roles.includes("admin"),
  });

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.full_name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  if (loading) return null;
  if (!roles.includes("admin")) return <Navigate to="/" replace />;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Gestor de Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  {ALL_ROLES.map((r) => (
                    <TableHead key={r} className="text-center">{ROLE_LABEL[r]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <td colSpan={2 + ALL_ROLES.length} className="p-6 text-center text-muted-foreground">
                      Cargando...
                    </td>
                  </TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <td colSpan={2 + ALL_ROLES.length} className="p-6 text-center text-muted-foreground">
                      No hay usuarios.
                    </td>
                  </TableRow>
                )}
                {filtered.map((u) => (
                  <UserRolesRow key={u.user_id} user={u} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}