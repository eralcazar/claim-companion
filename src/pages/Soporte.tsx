import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Mail, MessageCircle, Clock, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CANALES = [
  { icon: Mail, label: "Email", value: "soporte@carecentral.live", href: "mailto:soporte@carecentral.live" },
  { icon: MessageCircle, label: "WhatsApp", value: "+52 55 0000 0000", href: "https://wa.me/525500000000" },
];

const SLA = [
  { plan: "Gratuito", tiempo: "48 h hábiles", tone: "outline" },
  { plan: "Pro", tiempo: "12 h hábiles", tone: "secondary" },
  { plan: "Business", tiempo: "4 h hábiles", tone: "default" },
  { plan: "Enterprise", tiempo: "1 h · 24/7", tone: "default" },
];

export default function Soporte() {
  const { user, profile } = useAuth() as any;
  const [f, setF] = useState({ asunto: "", mensaje: "" });
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!f.asunto.trim() || !f.mensaje.trim()) {
      toast.error("Completa asunto y mensaje");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("notifications" as any).insert({
      user_id: user?.id,
      title: `Soporte: ${f.asunto}`,
      body: f.mensaje,
      type: "support_request",
      data: { from: profile?.full_name ?? user?.email, email: user?.email },
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Solicitud enviada. Te contactaremos en el tiempo del SLA.");
    setF({ asunto: "", mensaje: "" });
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <header>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-primary" /> Soporte técnico
        </h1>
        <p className="text-sm text-muted-foreground">Atención 100 % en español · horario: L-V 9:00-19:00 CDMX</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {CANALES.map((c) => (
          <a key={c.label} href={c.href} target="_blank" rel="noreferrer"
             className="rounded-2xl border border-border p-4 hover:border-primary transition flex items-start gap-3">
            <c.icon className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="font-semibold">{c.label}</p>
              <p className="text-sm text-muted-foreground">{c.value}</p>
            </div>
          </a>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Tiempos de respuesta por plan</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-sm">
            {SLA.map((s) => (
              <li key={s.plan} className="flex items-center justify-between py-2">
                <span className="font-medium">{s.plan}</span>
                <Badge variant={s.tone as any}>{s.tiempo}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Envíanos un mensaje</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Asunto</Label><Input value={f.asunto} onChange={(e) => setF({ ...f, asunto: e.target.value })} placeholder="Breve descripción" /></div>
          <div><Label>Mensaje</Label><Textarea rows={5} value={f.mensaje} onChange={(e) => setF({ ...f, mensaje: e.target.value })} placeholder="Detalla tu solicitud, incluye pasos para reproducir si es un error." /></div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={sending}>{sending ? "Enviando…" : "Enviar solicitud"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Recursos</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>· <a href="/legal" className="text-primary hover:underline">Aviso de privacidad y LFPDPPP</a></p>
          <p>· <a href="/mis-datos-ia" className="text-primary hover:underline">Mis datos y uso de IA</a></p>
          <p>· <a href="/dispositivos" className="text-primary hover:underline">Dispositivos compatibles</a></p>
        </CardContent>
      </Card>
    </div>
  );
}