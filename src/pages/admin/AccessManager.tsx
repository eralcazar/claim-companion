import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAllPermissions } from "@/hooks/usePermissions";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";

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
            Define qué funciones de la Aplicación del Bienestar Ciudadano puede ver y usar cada rol. Los cambios se aplican al instante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : (
            <PermissionMatrix permissions={data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}