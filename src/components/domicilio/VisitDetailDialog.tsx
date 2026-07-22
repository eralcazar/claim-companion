import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import { ensureLeafletIcons, OSM_ATTRIBUTION, OSM_TILE_URL } from "@/components/map/leafletSetup";
import { useUpdateHomeVisit } from "@/hooks/useHomeVisits";

ensureLeafletIcons();

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

  useEffect(() => {
    if (visit) {
      setLat(visit.lat != null ? Number(visit.lat) : null);
      setLng(visit.lng != null ? Number(visit.lng) : null);
      setDirty(false);
    }
  }, [visit]);

  if (!visit) return null;
  const hasCoords = lat != null && lng != null;

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
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{visit.direccion}</p>
          <div className="h-[420px] w-full overflow-hidden rounded-md border">
            {hasCoords && (
              <MapContainer center={[lat!, lng!]} zoom={17} style={{ height: "100%", width: "100%" }}>
                <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
                <Marker
                  ref={markerRef}
                  position={[lat!, lng!]}
                  draggable={canEdit}
                  eventHandlers={canEdit ? { dragend: onDragEnd } : undefined}
                />
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
        </div>
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