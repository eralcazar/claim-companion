import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type RequestType = "acceso" | "rectificacion" | "cancelacion" | "oposicion";

const TYPE_LABELS: Record<RequestType, string> = {
  acceso: "Acceso a mis datos",
  rectificacion: "Rectificación de datos",
  cancelacion: "Cancelación (eliminación)",
  oposicion: "Oposición al tratamiento",
};

const STATUS_LABELS: Record<string, { text: string; variant: "default" | "secondary" | "destructive" }> = {
  pendiente: { text: "Pendiente", variant: "secondary" },
  en_revision: { text: "En revisión", variant: "default" },
  completada: { text: "Completada", variant: "default" },
  rechazada: { text: "Rechazada", variant: "destructive" },
};

export default function DerechosARCO() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<RequestType>("acceso");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    document.title = "Derechos ARCO · CareCentral";
  }, []);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user?.email, email]);

  const { data: requests = [] } = useQuery({
    queryKey: ["arco_requests", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("arco_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Debes iniciar sesión");
      if (description.trim().length < 10) throw new Error("Describe con al menos 10 caracteres");
      if (!email.includes("@")) throw new Error("Correo de contacto inválido");
      const { error } = await supabase.from("arco_requests").insert([
        {
          user_id: user.id,
          request_type: type,
          description: description.trim(),
          contact_email: email.trim(),
          contact_phone: phone.trim() || null,
          status: "pendiente",
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Solicitud enviada", description: "Te responderemos en un máximo de 20 días hábiles." });
      setDescription("");
      setPhone("");
      qc.invalidateQueries({ queryKey: ["arco_requests"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/perfil">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver al perfil
        </Link>
      </Button>

      <header className="mb-6 flex items-start gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Derechos ARCO</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ejerce tus derechos de Acceso, Rectificación, Cancelación y Oposición conforme a la LFPDPPP.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nueva solicitud</CardTitle>
          <CardDescription>
            Responderemos en un plazo máximo de 20 días hábiles al correo que nos indiques.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de solicitud</Label>
            <Select value={type} onValueChange={(v) => setType(v as RequestType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descripción</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={5}
              placeholder="Describe qué datos y por qué solicitas esta acción..."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Correo de contacto</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
            </div>
          </div>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="w-full">
            {submit.isPending ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Mis solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no has enviado solicitudes.</p>
          ) : (
            <ul className="divide-y">
              {requests.map((r: any) => (
                <li key={r.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">{TYPE_LABELS[r.request_type as RequestType]}</p>
                    <p className="text-sm text-muted-foreground truncate">{r.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.created_at).toLocaleString("es-MX")}
                    </p>
                  </div>
                  <Badge variant={STATUS_LABELS[r.status]?.variant ?? "secondary"}>
                    {STATUS_LABELS[r.status]?.text ?? r.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}