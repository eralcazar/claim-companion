import { useState } from "react";
import { usePlans, useUpsertPlan, useDeletePlan, usePlanFeatures, useTogglePlanFeature, type SubscriptionPlan } from "@/hooks/usePlans";
import { useOcrPacks, useUpsertOcrPack, useDeleteOcrPack, useSyncOcrPack, type OcrPack } from "@/hooks/useOcrQuota";
import { useAiTokenPacks, useUpsertAiTokenPack, useDeleteAiTokenPack, useSyncAiTokenPack, type AiTokenPack } from "@/hooks/useAiTokenPacks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Layers, Plus, Edit, Trash2, RefreshCw, ScanLine, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AVAILABLE_FEATURES } from "@/lib/features";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export default function PlanManager() {
  const { data: plans = [], isLoading } = usePlans();
  const { data: features = [] } = usePlanFeatures();
  const upsert = useUpsertPlan();
  const del = useDeletePlan();
  const toggle = useTogglePlanFeature();
  const { data: ocrPacks = [], isLoading: loadingPacks } = useOcrPacks({ onlyActive: false });
  const upsertPack = useUpsertOcrPack();
  const deletePack = useDeleteOcrPack();
  const syncPack = useSyncOcrPack();
  const { data: aiPacks = [], isLoading: loadingAiPacks } = useAiTokenPacks({ onlyActive: false });
  const upsertAiPack = useUpsertAiTokenPack();
  const deleteAiPack = useDeleteAiTokenPack();
  const syncAiPack = useSyncAiTokenPack();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SubscriptionPlan> | null>(null);
  const [featDialogPlan, setFeatDialogPlan] = useState<SubscriptionPlan | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [packOpen, setPackOpen] = useState(false);
  const [packEditing, setPackEditing] = useState<Partial<OcrPack> | null>(null);
  const [aiPackOpen, setAiPackOpen] = useState(false);
  const [aiPackEditing, setAiPackEditing] = useState<Partial<AiTokenPack> | null>(null);

  const startNew = () => {
    setEditing({ nombre: "", descripcion: "", precio_mensual_centavos: 0, precio_anual_centavos: 0, moneda: "mxn", activo: true, orden: plans.length, ocr_pages_per_month: 0 });
    setOpen(true);
  };
  const save = async () => {
    if (!editing?.nombre) return;
    await upsert.mutateAsync(editing);
    setOpen(false);
    setEditing(null);
  };
  const sync = async (id: string) => {
    setSyncing(id);
    try {
      const { error } = await supabase.functions.invoke("sync-subscription-plan", {
        body: { plan_id: id, environment: getStripeEnvironment() },
      });
      if (error) throw error;
      toast.success("Plan publicado en cobros");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo publicar");
    } finally {
      setSyncing(null);
    }
  };

  const featuresForPlan = (planId: string) => new Set(features.filter((f) => f.plan_id === planId).map((f) => f.feature_key));

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" />Planes y paquetes
        </h1>
      </div>

      <Tabs defaultValue="planes" className="w-full">
        <TabsList>
          <TabsTrigger value="planes"><Layers className="h-4 w-4 mr-1" />Suscripciones</TabsTrigger>
          <TabsTrigger value="ocr"><ScanLine className="h-4 w-4 mr-1" />Paquetes OCR</TabsTrigger>
          <TabsTrigger value="kari"><Sparkles className="h-4 w-4 mr-1" />Paquetes Kari (IA)</TabsTrigger>
        </TabsList>

        <TabsContent value="planes" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Nuevo plan</Button>
          </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Mensual</TableHead>
                  <TableHead className="text-right">Anual</TableHead>
                  <TableHead className="text-right">OCR/mes</TableHead>
                  <TableHead>Funciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cobros</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => {
                  const set = featuresForPlan(p.id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{p.nombre}</p>
                        {p.descripcion && <p className="text-xs text-muted-foreground">{p.descripcion}</p>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">${(p.precio_mensual_centavos / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums">${(p.precio_anual_centavos / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.ocr_pages_per_month ?? 0}</TableCell>
                      <TableCell><Badge variant="outline">{set.size}</Badge></TableCell>
                      <TableCell><Badge variant={p.activo ? "default" : "secondary"}>{p.activo ? "Activo" : "Inactivo"}</Badge></TableCell>
                      <TableCell>{p.stripe_product_id ? <Badge variant="outline">OK</Badge> : <Badge variant="secondary">Pendiente</Badge>}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => setFeatDialogPlan(p)}>Funciones</Button>
                        <Button size="sm" variant="outline" onClick={() => sync(p.id)} disabled={syncing === p.id}>
                          <RefreshCw className={`h-3 w-3 mr-1 ${syncing === p.id ? "animate-spin" : ""}`} />Publicar
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {plans.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground p-8">Sin planes. Creá el primero.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="ocr" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setPackEditing({ nombre: "", descripcion: "", cantidad_escaneos: 50, precio_centavos: 0, moneda: "mxn", activo: true, orden: ocrPacks.length }); setPackOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Nuevo paquete
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {loadingPacks ? (
                <div className="p-8 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paquete</TableHead>
                      <TableHead className="text-right">Escaneos</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Cobros</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ocrPacks.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <p className="font-medium">{p.nombre}</p>
                          {p.descripcion && <p className="text-xs text-muted-foreground">{p.descripcion}</p>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.cantidad_escaneos}</TableCell>
                        <TableCell className="text-right tabular-nums">${(p.precio_centavos / 100).toFixed(2)} {p.moneda?.toUpperCase()}</TableCell>
                        <TableCell><Badge variant={p.activo ? "default" : "secondary"}>{p.activo ? "Activo" : "Inactivo"}</Badge></TableCell>
                        <TableCell>{p.stripe_product_id ? <Badge variant="outline">OK</Badge> : <Badge variant="secondary">Pendiente</Badge>}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="outline" onClick={() => syncPack.mutate({ pack_id: p.id, environment: getStripeEnvironment() as "sandbox" | "live" })} disabled={syncPack.isPending}>
                            <RefreshCw className={`h-3 w-3 mr-1 ${syncPack.isPending ? "animate-spin" : ""}`} />Publicar
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setPackEditing(p); setPackOpen(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deletePack.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {ocrPacks.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground p-8">Sin paquetes OCR. Creá el primero.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kari" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setAiPackEditing({ nombre: "", descripcion: "", tokens: 10000, precio_centavos: 0, moneda: "mxn", activo: true, orden: aiPacks.length }); setAiPackOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Nuevo paquete Kari
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {loadingAiPacks ? (
                <div className="p-8 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paquete</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Cobros</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiPacks.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <p className="font-medium">{p.nombre}</p>
                          {p.descripcion && <p className="text-xs text-muted-foreground">{p.descripcion}</p>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.tokens.toLocaleString("es-MX")}</TableCell>
                        <TableCell className="text-right tabular-nums">${(p.precio_centavos / 100).toFixed(2)} {p.moneda?.toUpperCase()}</TableCell>
                        <TableCell><Badge variant={p.activo ? "default" : "secondary"}>{p.activo ? "Activo" : "Inactivo"}</Badge></TableCell>
                        <TableCell>{p.stripe_product_id ? <Badge variant="outline">OK</Badge> : <Badge variant="secondary">Pendiente</Badge>}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="outline" onClick={() => syncAiPack.mutate({ pack_id: p.id, environment: getStripeEnvironment() as "sandbox" | "live" })} disabled={syncAiPack.isPending}>
                            <RefreshCw className={`h-3 w-3 mr-1 ${syncAiPack.isPending ? "animate-spin" : ""}`} />Publicar
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setAiPackEditing(p); setAiPackOpen(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteAiPack.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {aiPacks.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground p-8">Sin paquetes de Kari. Creá el primero.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nuevo"} plan</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={editing.nombre || ""} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })} /></div>
              <div><Label>Descripción</Label><Textarea rows={2} value={editing.descripcion || ""} onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Precio mensual (MXN)</Label>
                  <Input type="number" step="0.01" value={(editing.precio_mensual_centavos ?? 0) / 100}
                    onChange={(e) => setEditing({ ...editing, precio_mensual_centavos: Math.round(parseFloat(e.target.value || "0") * 100) })} /></div>
                <div><Label>Precio anual (MXN)</Label>
                  <Input type="number" step="0.01" value={(editing.precio_anual_centavos ?? 0) / 100}
                    onChange={(e) => setEditing({ ...editing, precio_anual_centavos: Math.round(parseFloat(e.target.value || "0") * 100) })} /></div>
                <div><Label>Escaneos OCR / mes</Label>
                  <Input type="number" value={editing.ocr_pages_per_month ?? 0}
                    onChange={(e) => setEditing({ ...editing, ocr_pages_per_month: Math.max(0, parseInt(e.target.value || "0", 10)) })} />
                  <p className="text-xs text-muted-foreground mt-1">Páginas de OCR incluidas por ciclo de facturación.</p>
                </div>
                <div><Label>Orden</Label><Input type="number" value={editing.orden ?? 0} onChange={(e) => setEditing({ ...editing, orden: Number(e.target.value) })} /></div>
                <div className="flex items-end gap-2">
                  <Switch checked={!!editing.activo} onCheckedChange={(v) => setEditing({ ...editing, activo: v })} /><Label>Activo</Label>
                </div>
              </div>
              <Button className="w-full" onClick={save} disabled={upsert.isPending}>Guardar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!featDialogPlan} onOpenChange={(v) => !v && setFeatDialogPlan(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Funciones de "{featDialogPlan?.nombre}"</DialogTitle></DialogHeader>
          {featDialogPlan && (() => {
            const set = featuresForPlan(featDialogPlan.id);
            return (
              <div className="space-y-2">
                {AVAILABLE_FEATURES.map((feat) => {
                  const Icon = feat.icon;
                  const enabled = set.has(feat.key);
                  return (
                    <div key={feat.key} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{feat.label}</span>
                      </div>
                      <Switch checked={enabled} onCheckedChange={(v) => toggle.mutate({ plan_id: featDialogPlan.id, feature_key: feat.key, enabled: v })} />
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={packOpen} onOpenChange={setPackOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{packEditing?.id ? "Editar" : "Nuevo"} paquete OCR</DialogTitle></DialogHeader>
          {packEditing && (
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={packEditing.nombre || ""} onChange={(e) => setPackEditing({ ...packEditing, nombre: e.target.value })} /></div>
              <div><Label>Descripción</Label><Textarea rows={2} value={packEditing.descripcion || ""} onChange={(e) => setPackEditing({ ...packEditing, descripcion: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cantidad de escaneos</Label>
                  <Input type="number" value={packEditing.cantidad_escaneos ?? 0}
                    onChange={(e) => setPackEditing({ ...packEditing, cantidad_escaneos: Math.max(1, parseInt(e.target.value || "0", 10)) })} /></div>
                <div><Label>Precio (MXN)</Label>
                  <Input type="number" step="0.01" value={(packEditing.precio_centavos ?? 0) / 100}
                    onChange={(e) => setPackEditing({ ...packEditing, precio_centavos: Math.round(parseFloat(e.target.value || "0") * 100) })} /></div>
                <div><Label>Orden</Label><Input type="number" value={packEditing.orden ?? 0} onChange={(e) => setPackEditing({ ...packEditing, orden: Number(e.target.value) })} /></div>
                <div className="flex items-end gap-2">
                  <Switch checked={!!packEditing.activo} onCheckedChange={(v) => setPackEditing({ ...packEditing, activo: v })} /><Label>Activo</Label>
                </div>
              </div>
              <Button className="w-full" onClick={async () => {
                if (!packEditing.nombre) { toast.error("Falta el nombre"); return; }
                await upsertPack.mutateAsync(packEditing);
                setPackOpen(false);
                setPackEditing(null);
              }} disabled={upsertPack.isPending}>Guardar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}