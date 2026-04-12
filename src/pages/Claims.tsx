import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Claims() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: claims, isLoading } = useQuery({
    queryKey: ["claims", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("claims")
        .select("*, insurance_policies(company, policy_number)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pendiente: "secondary",
    aprobado: "default",
    rechazado: "destructive",
    en_revision: "outline",
  };

  const statusLabel: Record<string, string> = {
    pendiente: "Pendiente",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
    en_revision: "En revisión",
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Mis Reclamos</h1>
        <Button size="sm" onClick={() => navigate("/reclamos/nuevo")}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : claims?.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No tienes reclamos</CardContent></Card>
      ) : (
        claims?.map((claim) => (
          <Card key={claim.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {claim.diagnosis}
                </CardTitle>
                <Badge variant={statusVariant[claim.status]}>
                  {statusLabel[claim.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {(claim as any).insurance_policies?.company} — {(claim as any).insurance_policies?.policy_number}
              </p>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Costo: ${Number(claim.total_cost).toLocaleString()}</span>
                <span>{format(new Date(claim.created_at), "PP", { locale: es })}</span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
