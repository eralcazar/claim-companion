import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, LocateFixed, Search } from "lucide-react";
import { toast } from "sonner";
import { ensureLeafletIcons, OSM_ATTRIBUTION, OSM_TILE_URL } from "@/components/map/leafletSetup";

ensureLeafletIcons();

export interface AddressValue {
  direccion: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
}

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332]; // CDMX fallback

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], 16, { animate: true });
  }, [lat, lng, map]);
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`,
      { headers: { Accept: "application/json" } }
    );
    const j = await r.json();
    return j?.display_name ?? null;
  } catch {
    return null;
  }
}

async function forwardGeocode(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=es&q=${encodeURIComponent(query)}`
    );
    const j = await r.json();
    if (!Array.isArray(j) || j.length === 0) return null;
    return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon), label: j[0].display_name };
  } catch {
    return null;
  }
}

export function AddressPicker({ value, onChange }: Props) {
  const [detecting, setDetecting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const markerRef = useRef<L.Marker>(null);

  const center: [number, number] =
    value.lat != null && value.lng != null ? [value.lat, value.lng] : DEFAULT_CENTER;

  const detect = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalización no disponible en este dispositivo");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = await reverseGeocode(latitude, longitude);
        onChange({ lat: latitude, lng: longitude, direccion: label ?? value.direccion });
        setDetecting(false);
        if (!label) toast.warning("Ubicación detectada, ajusta la dirección manualmente");
      },
      (err) => {
        setDetecting(false);
        toast.error(err.message || "No se pudo obtener la ubicación");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const search = async () => {
    const q = query || value.direccion;
    if (!q.trim()) return;
    setSearching(true);
    const r = await forwardGeocode(q);
    setSearching(false);
    if (!r) return toast.error("No se encontró la dirección");
    onChange({ lat: r.lat, lng: r.lng, direccion: r.label });
  };

  const onDragEnd = async () => {
    const m = markerRef.current;
    if (!m) return;
    const { lat, lng } = m.getLatLng();
    const label = await reverseGeocode(lat, lng);
    onChange({ lat, lng, direccion: label ?? value.direccion });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Dirección</Label>
        <Button type="button" size="sm" variant="secondary" onClick={detect} disabled={detecting}>
          {detecting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <LocateFixed className="h-3 w-3 mr-1" />}
          Usar mi ubicación
        </Button>
      </div>
      <Textarea
        rows={2}
        value={value.direccion}
        onChange={(e) => onChange({ ...value, direccion: e.target.value })}
        placeholder="Calle, número, colonia, ciudad"
      />
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
          placeholder="Buscar en el mapa (o usa la dirección arriba)"
        />
        <Button type="button" variant="outline" onClick={search} disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      <div className="h-56 w-full overflow-hidden rounded-md border">
        <MapContainer
          center={center}
          zoom={value.lat != null ? 16 : 12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
          <Recenter lat={value.lat} lng={value.lng} />
          {value.lat != null && value.lng != null && (
            <Marker
              ref={markerRef}
              position={[value.lat, value.lng]}
              draggable
              eventHandlers={{ dragend: onDragEnd }}
            />
          )}
        </MapContainer>
      </div>
      {value.lat != null && value.lng != null && (
        <p className="text-[11px] text-muted-foreground">
          Coordenadas: {value.lat.toFixed(5)}, {value.lng.toFixed(5)} · Arrastra el pin para ajustar
        </p>
      )}
    </div>
  );
}

export function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="h-32 w-full overflow-hidden rounded-md border">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
        <Marker position={[lat, lng]} />
      </MapContainer>
    </div>
  );
}