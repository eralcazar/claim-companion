import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function BrokerPanel() {
  const { user } = useAuth();

  const { data: patients, isLoading } = useQuery({
    queryKey: ["broker-patients", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("broker_patients")
        .select("patient_id, profiles!broker_patients_patient_id_fkey(full_name, email, phone)")
        .eq("broker_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        Panel Broker
      </h1>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : patients?.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Sin pacientes asignados</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {patients?.map((p: any) => (
            <Card key={p.patient_id}>
              <CardContent className="p-4">
                <p className="font-medium">{p.profiles?.full_name || "Sin nombre"}</p>
                <p className="text-sm text-muted-foreground">{p.profiles?.email}</p>
                <p className="text-sm text-muted-foreground">{p.profiles?.phone}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
