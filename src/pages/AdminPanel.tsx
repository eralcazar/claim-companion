import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function AdminPanel() {
  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        Panel Admin
      </h1>
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Panel de administración en desarrollo. Próximamente podrás gestionar usuarios, asignar pacientes a brokers y ver estadísticas generales.
        </CardContent>
      </Card>
    </div>
  );
}
