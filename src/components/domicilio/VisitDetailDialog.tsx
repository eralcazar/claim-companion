import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";
import { ensureLeafletIcons, OSM_ATTRIBUTION, OSM_TILE_URL } from "@/components/map/leafletSetup";
import { useUpdateHomeVisit } from "@/hooks/useHomeVisits";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VisitTimeline } from "./VisitTimeline";
import { useVisitLiveDoctorLocation } from "@/hooks/useDoctorLiveLocation";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

ensureLeafletIcons();

const doctorIcon = L.divIcon({
  className: "",
  html:
    '<div style="width:20px;height:20px;border-radius:9999px;background:#14B8A6;border:3px solid white;box-shadow:0 0 0 2px #0F172A;"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface Props {
  visit: any | null;
  canEdit: boolean;
  onClose: () => void;
}

export function VisitDetailDialog({ visit, canEdit, onClose }: Props) {
  const update = useUpdateHomeVisit();
  const markerRef = useRef<L.Marker>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const { loc: doctorLoc, track } = useVisitLiveDoctorLocation(visit);

  useEffect(() => {
    if (visit) {
      setLat(visit.lat != null ? Number(visit.lat) : null);
      setLng(visit.lng != null ? Number(visit.lng) : null);
      setDirty(false);
    }
  }, [visit]);

  if (!visit) return null;
  const hasCoords = lat != null && lng != null;
  const hasDoctor = doctorLoc.lat != null && doctorLoc.lng != null;
  const showLive = ["aceptada", "en_camino", "llegada"].includes(visit.estado);

  const onDragEnd = () => {
    const m = markerRef.current;
    if (!m) return;
    const p = m.getLatLng();
    setLat(p.lat);
    setLng(p.lng);
    setDirty(true);
  };

  const save = async () => {
    if (!hasCoords) return;
    await update.mutateAsync({ id: visit.id, lat, lng });
    setDirty(false);
    onClose();
  };

  return (
    <Dialog open={!!visit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{visit.motivo}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="mapa">
          <TabsList>
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
            <TabsTrigger value="timeline">Historial</TabsTrigger>
          </TabsList>
          <TabsContent value="mapa" className="space-y-3">
            <p className="text-sm text-muted-foreground">{visit.direccion}</p>
            {showLive && (
              <div className="flex items-center gap-2 text-xs">
                {doctorLoc.sharing ? (
                  <Badge className="bg-teal-600 hover:bg-teal-600">🟢 Médico en camino</Badge>
                ) : (
                  <Badge variant="outline">Ubicación no compartida</Badge>
                )}
                {doctorLoc.updated_at && (
                  <span className="text-muted-foreground">
                    Actualizado {formatDistanceToNow(new Date(doctorLoc.updated_at), { addSuffix: true, locale: es })}
                  </span>
                )}
                {doctorLoc.accuracy_m != null && (
                  <span className="text-muted-foreground">± {Math.round(doctorLoc.accuracy_m)} m</span>
                )}
              </div>
            )}
            <div className="h-[380px] w-full overflow-hidden rounded-md border">
            {hasCoords && (
              <MapContainer center={[lat!, lng!]} zoom={17} style={{ height: "100%", width: "100%" }}>
                <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
                <Marker
                  ref={markerRef}
                  position={[lat!, lng!]}
                  draggable={canEdit}
                  eventHandlers={canEdit ? { dragend: onDragEnd } : undefined}
                >
                  <Tooltip permanent direction="top" offset={[0, -12]}>Paciente</Tooltip>
                </Marker>
                {hasDoctor && (
                  <Marker position={[doctorLoc.lat!, doctorLoc.lng!]} icon={doctorIcon}>
                    <Tooltip permanent direction="top" offset={[0, -12]}>Médico</Tooltip>
                  </Marker>
                )}
                {track.length > 1 && (
                  <Polyline positions={track} pathOptions={{ color: "#14B8A6", weight: 4, opacity: 0.75 }} />
                )}
              </MapContainer>
            )}
            {!hasCoords && (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sin coordenadas
              </div>
            )}
            </div>
            {hasCoords && (
              <p className="text-xs text-muted-foreground">
                {lat!.toFixed(6)}, {lng!.toFixed(6)}
                {canEdit && " · Arrastra el pin para reubicar"}
              </p>
            )}
          </TabsContent>
          <TabsContent value="timeline" className="pt-2">
            <VisitTimeline visitId={visit.id} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          {canEdit && (
            <Button disabled={!dirty || update.isPending} onClick={save}>
              Guardar ubicación
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}