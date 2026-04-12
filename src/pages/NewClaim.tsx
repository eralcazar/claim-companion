import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ClaimType = Database["public"]["Enums"]["claim_type"];

export default function NewClaim() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    claim_type: "" as ClaimType | "",
    policy_id: "",
    incident_date: "",
    diagnosis: "",
    treatment: "",
    total_cost: "",
    notes: "",
  });

  const { data: policies } = useQuery({
    queryKey: ["policies-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_policies")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "activa");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("claims").insert({
        user_id: user!.id,
        policy_id: form.policy_id,
        claim_type: form.claim_type as ClaimType,
        incident_date: form.incident_date,
        diagnosis: form.diagnosis,
        treatment: form.treatment,
        total_cost: parseFloat(form.total_cost),
        notes: form.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reclamo creado exitosamente");
      navigate("/reclamos");
    },
    onError: () => toast.error("Error al crear reclamo"),
  });

  const selectedPolicy = policies?.find((p) => p.id === form.policy_id);

  const steps = [
    {
      title: "Tipo de Reclamo",
      content: (
        <div className="space-y-4">
          <Label>¿Qué tipo de reclamo deseas hacer?</Label>
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant={form.claim_type === "reembolso" ? "default" : "outline"}
              className="h-auto py-4 flex flex-col items-start"
              onClick={() => setForm({ ...form, claim_type: "reembolso" })}
            >
              <span className="font-semibold">Reembolso</span>
              <span className="text-xs opacity-80">Ya pagaste y quieres que te devuelvan el dinero</span>
            </Button>
            <Button
              variant={form.claim_type === "procedimiento_programado" ? "default" : "outline"}
              className="h-auto py-4 flex flex-col items-start"
              onClick={() => setForm({ ...form, claim_type: "procedimiento_programado" })}
            >
              <span className="font-semibold">Procedimiento Programado</span>
              <span className="text-xs opacity-80">Necesitas autorización para un procedimiento</span>
            </Button>
          </div>
        </div>
      ),
      valid: !!form.claim_type,
    },
    {
      title: "Datos del Reclamo",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Póliza</Label>
            <Select value={form.policy_id} onValueChange={(v) => setForm({ ...form, policy_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona póliza" /></SelectTrigger>
              <SelectContent>
                {policies?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.company} — {p.policy_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p><strong>Paciente:</strong> {profile?.full_name}</p>
            {selectedPolicy && <p><strong>Póliza:</strong> {selectedPolicy.company} — {selectedPolicy.policy_number}</p>}
          </div>
          <div className="space-y-2">
            <Label>Fecha del incidente</Label>
            <Input type="date" value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Diagnóstico</Label>
            <Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} placeholder="Ej: Fractura de muñeca" />
          </div>
          <div className="space-y-2">
            <Label>Descripción del tratamiento</Label>
            <Textarea value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} placeholder="Describe el tratamiento recibido" />
          </div>
          <div className="space-y-2">
            <Label>Costo total ($)</Label>
            <Input type="number" value={form.total_cost} onChange={(e) => setForm({ ...form, total_cost: e.target.value })} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Notas adicionales (opcional)</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      ),
      valid: !!form.policy_id && !!form.incident_date && !!form.diagnosis && !!form.treatment && !!form.total_cost,
    },
    {
      title: "Revisión",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Revisa los datos antes de enviar:</p>
          <div className="rounded-lg border p-4 space-y-2 text-sm">
            <p><strong>Tipo:</strong> {form.claim_type === "reembolso" ? "Reembolso" : "Procedimiento Programado"}</p>
            <p><strong>Paciente:</strong> {profile?.full_name}</p>
            <p><strong>Póliza:</strong> {selectedPolicy?.company} — {selectedPolicy?.policy_number}</p>
            <p><strong>Fecha:</strong> {form.incident_date}</p>
            <p><strong>Diagnóstico:</strong> {form.diagnosis}</p>
            <p><strong>Tratamiento:</strong> {form.treatment}</p>
            <p><strong>Costo:</strong> ${Number(form.total_cost).toLocaleString()}</p>
            {form.notes && <p><strong>Notas:</strong> {form.notes}</p>}
          </div>
        </div>
      ),
      valid: true,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold">Nuevo Reclamo</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`h-0.5 w-8 ${i < step ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{steps[step].title}</CardTitle></CardHeader>
        <CardContent>{steps[step].content}</CardContent>
      </Card>

      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button className="flex-1" disabled={!steps[step].valid} onClick={() => setStep(step + 1)}>
            Siguiente <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button className="flex-1" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Enviando..." : "Enviar Reclamo"}
          </Button>
        )}
      </div>
    </div>
  );
}
