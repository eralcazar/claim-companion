import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, Link2, MessageCircle, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ShareResourceType,
  buildShareUrl,
  buildWhatsAppUrl,
  useCreateShareLink,
  useResourceShareLinks,
  useRevokeShareLink,
} from "@/hooks/useShareLinks";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  resourceType: ShareResourceType;
  resourceId: string;
  title?: string;
  whatsappMessage?: (url: string) => string;
}

const resourceLabels: Record<ShareResourceType, string> = {
  appointment: "Cita",
  receta: "Receta",
  estudio: "Estudio",
  claim: "Solicitud",
  format: "Formato",
};

export function ShareLinkDialog({ open, onOpenChange, resourceType, resourceId, title, whatsappMessage }: Props) {
  const { data: links = [] } = useResourceShareLinks(resourceType, resourceId);
  const create = useCreateShareLink();
  const revoke = useRevokeShareLink();
  const [expiryDays, setExpiryDays] = useState<string>("7");

  const activeLink = useMemo(
    () => links.find((l) => !l.revoked_at && (!l.expires_at || new Date(l.expires_at) > new Date())),
    [links]
  );

  const handleCreate = () => {
    const val = expiryDays === "never" ? null : Number(expiryDays);
    create.mutate({ resourceType, resourceId, expiresInDays: val });
  };

  const copyLink = (token: string) => {
    const url = buildShareUrl(token);
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
  };

  const shareWhatsApp = (token: string) => {
    const url = buildShareUrl(token);
    const msg =
      whatsappMessage?.(url) ??
      // Fallback: mensaje genérico si el llamador no personalizó
      `📎 *${resourceLabels[resourceType]} — CareCentral*${title ? `\n${title}` : ""}\n\n🔗 ${url}\n\nRegístrate gratis en CareCentral para acceder a tu expediente médico completo.`;
    window.open(buildWhatsAppUrl(msg), "_blank", "noopener");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Compartir {resourceLabels[resourceType].toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Genera un enlace público (predeterminado 7 días, máximo 30) y envíalo por WhatsApp.
            Puedes revocarlo en cualquier momento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label>Expiración</Label>
          <div className="flex gap-2">
            <Select value={expiryDays} onValueChange={setExpiryDays}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 día</SelectItem>
                <SelectItem value="7">7 días (recomendado)</SelectItem>
                <SelectItem value="14">14 días</SelectItem>
                <SelectItem value="30">30 días (máximo)</SelectItem>
                <SelectItem value="never">Sin expiración (revocable)</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} disabled={create.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Generar
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-2 max-h-[45vh] overflow-y-auto">
          {links.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no has generado enlaces para este recurso.</p>
          )}
          {links.map((l) => {
            const isRevoked = !!l.revoked_at;
            const isExpired = !!l.expires_at && new Date(l.expires_at) < new Date();
            const isActive = !isRevoked && !isExpired;
            return (
              <div key={l.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isRevoked ? "Revocado" : isExpired ? "Expirado" : "Activo"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {l.view_count} {l.view_count === 1 ? "vista" : "vistas"}
                    </span>
                  </div>
                  {!isRevoked && (
                    <Button variant="ghost" size="sm" onClick={() => revoke.mutate(l.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input readOnly value={buildShareUrl(l.token)} className="text-xs" />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyLink(l.token)} disabled={!isActive}>
                    <Copy className="h-4 w-4 mr-1" /> Copiar
                  </Button>
                  <Button size="sm" onClick={() => shareWhatsApp(l.token)} disabled={!isActive}>
                    <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {l.expires_at
                    ? `Expira ${format(new Date(l.expires_at), "PPp", { locale: es })}`
                    : "Sin expiración (revocable manualmente)"}
                </p>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}