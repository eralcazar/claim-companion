import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface FormatItem {
  label: string;
  file: string;
}

function getFormats(company: string): FormatItem[] {
  const isMetLife = company.toLowerCase().includes("metlife");
  if (isMetLife) {
    return [
      { label: "Solicitud de Reembolso", file: "/forms/METLIFE_REEMBOLSO.pdf" },
      { label: "Programación de Servicios", file: "/forms/METLIFE_PROGRAMACION_DE_SERVICIOS.pdf" },
      { label: "Informe Médico", file: "/forms/METLIFE_INFORME_MEDICO.pdf" },
    ];
  }
  return [
    { label: "Solicitud de Reembolso", file: "/forms/MAPFRE_REEMBOLSO.pdf" },
    { label: "Programación de Servicios", file: "/forms/MAPFRE_PROGRAMACION_DE_SERVICIOS.pdf" },
    { label: "Informe Médico", file: "/forms/MAPFRE_INFORME_MEDICO.pdf" },
  ];
}

function downloadFile(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  toast.success(`Descargando ${fileName}`);
}

export default function Formats() {
  const { user } = useAuth();
  const [selectedPolicyId, setSelectedPolicyId] = useState("");

  const { data: policies, isLoading } = useQuery({
    queryKey: ["policies-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_policies")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "activa")
        .order("company");
      return data ?? [];
    },
    enabled: !!user,
  });

  const selectedPolicy = policies?.find((p) => p.id === selectedPolicyId);
  const formats = selectedPolicy ? getFormats(selectedPolicy.company) : [];

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold">Descargar Formatos</h1>
      <p className="text-sm text-muted-foreground">
        Selecciona tu póliza para descargar los formatos originales en blanco de tu aseguradora.
      </p>

      <div className="space-y-2">
        <Label>Póliza</Label>
        <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una póliza" />
          </SelectTrigger>
          <SelectContent>
            {policies?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.company} — {p.policy_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedPolicy && policies?.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No tienes pólizas activas. Agrega una en la sección de Pólizas.
          </CardContent>
        </Card>
      )}

      {selectedPolicy && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Formatos {selectedPolicy.company}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formats.map((f) => (
              <div
                key={f.file}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm font-medium">{f.label}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const fileName = f.file.split("/").pop() || "formato.pdf";
                    downloadFile(f.file, fileName);
                  }}
                >
                  <Download className="h-4 w-4 mr-1" /> Descargar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
