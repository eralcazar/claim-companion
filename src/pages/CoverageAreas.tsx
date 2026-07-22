import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MapPin } from "lucide-react";
import { ensureLeafletIcons, OSM_ATTRIBUTION, OSM_TILE_URL } from "@/components/map/leafletSetup";
import {
  useCoverageAreas,
  useDeleteCoverageArea,
  useUpsertCoverageArea,
} from "@/hooks/useCoverageAreas";
import type { CoverageArea } from "@/lib/geo/coverage";

ensureLeafletIcons();

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

export default function CoverageAreas() {
  const { user, roles } = useAuth();
  const isPro = roles.includes("medico" as any) || roles.includes("admin" as any);
  const isAdmin = roles.includes("admin" as any);
  const { data: areas = [] } = useCoverageAreas();
  const upsert = useUpsertCoverageArea();
  const remove = useDeleteCoverageArea();

  const [editing, setEditing] = useState<Partial<CoverageArea> | null>(null);

  useEffect(() => {
    if (!editing && user) {
      setEditing({
        nombre: "",
        center_lat: DEFAULT_CENTER[0],
        center_lng: DEFAULT_CENTER[1],
        radius_m: 3000,
        activa: true,
        owner_id: user.id,
      });
    }
  }, [user]);

  if (!user) return null;
  if (!isPro) return <Navigate to="/domicilio" replace />;

  const save = async () => {
    if (!editing?.nombre || editing.center_lat == null || editing.center_lng == null) return;
    await upsert.mutateAsync({
      id: editing.id,
      owner_id: editing.owner_id ?? user.id,
      nombre: editing.nombre,
      center_lat: editing.center_lat,
      center_lng: editing.center_lng,
      radius_m: editing.radius_m ?? 3000,
      activa: editing.activa ?? true,
    });
    setEditing({
      nombre: "",
      center_lat: DEFAULT_CENTER[0],
      center_lng: DEFAULT_CENTER[1],
      radius_m: 3000,
      activa: true,
      owner_id: user.id,
    });
  };

  const center: [number, number] = editing?.center_lat != null && editing?.center_lng != null
    ? [editing.center_lat, editing.center_lng]
    : DEFAULT_CENTER;

  return (
    <div className="container py-6 max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-semibold flex items-center gap-2">
          <MapPin className="h-6 w-6" />Áreas de cobertura a domicilio
        </h1>
        <p className="text-sm text-muted-foreground">
          Define círculos geográficos donde ofreces servicio. Se muestran a los pacientes al elegir dirección.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{editing?.id ? "Editar área" : "Nueva área"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input
                value={editing?.nombre ?? ""}
                onChange={(e) => setEditing({ ...editing!, nombre: e.target.value })}
                placeholder="Colonia Roma, Zona sur..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Radio (m)</Label>
                <Input
                  type="number"
                  min={100}
                  step={100}
                  value={editing?.radius_m ?? 3000}
                  onChange={(e) => setEditing({ ...editing!, radius_m: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing?.activa ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing!, activa: v })}
                  />
                  <Label>Activa</Label>
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing?.owner_id === null}
                  onCheckedChange={(v) => setEditing({ ...editing!, owner_id: v ? null : user.id })}
                />
                <Label>Área global (todos los médicos)</Label>
              </div>
            )}
            <div className="h-72 overflow-hidden rounded-md border">
              <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
                <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
                <ClickToPlace onPick={(lat, lng) => setEditing({ ...editing!, center_lat: lat, center_lng: lng })} />
                {editing?.center_lat != null && editing?.center_lng != null && (
                  <>
                    <Marker position={[editing.center_lat, editing.center_lng]} />
                    <Circle
                      center={[editing.center_lat, editing.center_lng]}
                      radius={editing.radius_m ?? 3000}
                      pathOptions={{ color: "hsl(var(--primary))", fillOpacity: 0.15 }}
                    />
                  </>
                )}
              </MapContainer>
            </div>
            <p className="text-xs text-muted-foreground">Toca el mapa para fijar el centro.</p>
            <div className="flex gap-2 justify-end">
              {editing?.id && (
                <Button variant="ghost" onClick={() => setEditing({
                  nombre: "", center_lat: DEFAULT_CENTER[0], center_lng: DEFAULT_CENTER[1],
                  radius_m: 3000, activa: true, owner_id: user.id,
                })}>Cancelar</Button>
              )}
              <Button onClick={save} disabled={!editing?.nombre || upsert.isPending}>
                <Plus className="h-4 w-4 mr-1" />{editing?.id ? "Guardar cambios" : "Crear área"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Áreas existentes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {areas.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin áreas registradas.</p>
            )}
            {areas.map((a) => {
              const mine = a.owner_id === user.id;
              const canEdit = mine || isAdmin;
              return (
                <div key={a.id} className="flex items-center justify-between gap-2 border rounded-md p-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{a.nombre}</span>
                      <Badge variant={a.activa ? "default" : "outline"}>{a.activa ? "Activa" : "Inactiva"}</Badge>
                      {a.owner_id === null && <Badge variant="secondary">Global</Badge>}
                      {!mine && a.owner_id !== null && <Badge variant="outline">Otro médico</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Radio {a.radius_m} m · {a.center_lat.toFixed(4)}, {a.center_lng.toFixed(4)}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>Editar</Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => confirm("¿Eliminar área?") && remove.mutate(a.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}