import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAllPermissions } from "@/hooks/usePermissions";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";
import { PlanRolePermissionMatrix } from "@/components/admin/PlanRolePermissionMatrix";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AccessManager() {
  const { roles, loading } = useAuth();
  const { data, isLoading } = useAllPermissions();

  if (loading) return null;
  if (!roles.includes("admin")) return <Navigate to="/" replace />;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Perfiles de Acceso</CardTitle>
          <CardDescription>
            Define qué funciones puede ver y usar cada rol y, opcionalmente, en qué paquetes está incluido el acceso. Los cambios se aplican al instante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : (
            <Tabs defaultValue="roles" className="space-y-4">
              <TabsList>
                <TabsTrigger value="roles">Por rol</TabsTrigger>
                <TabsTrigger value="planes">Por paquete</TabsTrigger>
              </TabsList>
              <TabsContent value="roles">
                <PermissionMatrix permissions={data ?? []} />
              </TabsContent>
              <TabsContent value="planes">
                <PlanRolePermissionMatrix permissions={data ?? []} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}