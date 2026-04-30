import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Gift, Link as LinkIcon, Loader2, Copy } from "lucide-react";

export function AssignPlanDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userName: string;
}) {
  const qc = useQueryClient();
  const [planId, setPlanId] = useState<string>("");
  const [months, setMonths] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  const { data: plans } = useQuery({
    queryKey: ["subscription_plans_assign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, nombre, precio_mensual_centavos")
        .eq("activo", true)
        .order("orden");
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleGrantFree = async () => {
    if (!planId) {
      toast({ title: "Selecciona un paquete", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("assign_free_plan", {
        _user_id: userId,
        _plan_id: planId,
        _months: months,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["users_with_roles"] });
      toast({
        title: "Paquete asignado",
        description: `Cortesía concedida a ${userName} por ${months} mes(es).`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "No se pudo asignar", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLink = async () => {
    if (!planId) {
      toast({ title: "Selecciona un paquete", variant: "destructive" });
      return;
    }
    setBusy(true);
    setPaymentLink(null);
    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke("subscription-create-checkout", {
        body: {
          plan_id: planId,
          interval: "mensual",
          target_user_id: userId,
          return_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        },
      });
      if (error) throw error;
      const url = data?.url || data?.checkout_url || data?.client_secret;
      if (!url) throw new Error("No se recibió URL/clientSecret");
      setPaymentLink(typeof url === "string" ? url : JSON.stringify(url));
      toast({ title: "Link generado", description: "Cópialo y compártelo." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "No se pudo generar el link", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar paquete</DialogTitle>
          <DialogDescription>
            Para <strong>{userName}</strong>: regala un paquete (cortesía) o genera un link de pago.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Paquete</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar paquete" /></SelectTrigger>
              <SelectContent>
                {(plans ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} {p.precio_mensual_centavos === 0 ? "(Gratis)" : `· $${(p.precio_mensual_centavos/100).toFixed(0)}/mes`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="free">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="free"><Gift className="h-3.5 w-3.5 mr-1" /> Cortesía</TabsTrigger>
              <TabsTrigger value="paid"><LinkIcon className="h-3.5 w-3.5 mr-1" /> Link de pago</TabsTrigger>
            </TabsList>

            <TabsContent value="free" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Duración (meses)</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={months}
                  onChange={(e) => setMonths(Math.max(1, parseInt(e.target.value || "1", 10)))}
                />
              </div>
              <Button onClick={handleGrantFree} disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                Asignar cortesía
              </Button>
            </TabsContent>

            <TabsContent value="paid" className="space-y-3 pt-3">
              <Button onClick={handleCreateLink} disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                Generar link de pago
              </Button>
              {paymentLink && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Link de pago</Label>
                  <div className="flex gap-2">
                    <Input value={paymentLink} readOnly className="text-xs" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(paymentLink);
                        toast({ title: "Copiado" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}