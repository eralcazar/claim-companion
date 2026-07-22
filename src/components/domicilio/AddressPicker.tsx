import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { ensureLeafletIcons, OSM_ATTRIBUTION, OSM_TILE_URL } from "@/components/map/leafletSetup";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCoverageAreas } from "@/hooks/useCoverageAreas";
import { isInsideAnyArea } from "@/lib/geo/coverage";
import { checkGeoPermission, permissionInstructions, type GeoPermissionState } from "@/lib/geo/permissions";

ensureLeafletIcons();

export interface AddressValue {
  direccion: string;
  lat: number | null;
  lng: number | null;
  accuracy_m?: number | null;
  location_source?: "gps" | "approx" | "search" | "manual" | "map" | null;
  in_coverage?: boolean | null;
}

interface Props {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  showCoverage?: boolean;
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

interface Suggestion { lat: number; lng: number; label: string }

async function searchSuggestions(query: string): Promise<Suggestion[]> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=es&countrycodes=mx&addressdetails=1&q=${encodeURIComponent(query)}`
    );
    const j = await r.json();
    if (!Array.isArray(j)) return [];
    return j.map((r: any) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      label: r.display_name as string,
    }));
  } catch {
    return [];
  }
}

export function AddressPicker({ value, onChange, showCoverage = true }: Props) {
  const [detecting, setDetecting] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [openSuggest, setOpenSuggest] = useState(false);
  const [permission, setPermission] = useState<GeoPermissionState>("prompt");
  const markerRef = useRef<L.Marker>(null);
  const { data: areas = [] } = useCoverageAreas({ onlyActive: true });

  const center: [number, number] =
    value.lat != null && value.lng != null ? [value.lat, value.lng] : DEFAULT_CENTER;

  useEffect(() => {
    checkGeoPermission().then(setPermission);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchSuggestions(query);
      setSuggestions(r);
      setSearching(false);
      setOpenSuggest(true);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const inCoverage = useMemo(() => {
    if (value.lat == null || value.lng == null || areas.length === 0) return null;
    return isInsideAnyArea(value.lat, value.lng, areas);
  }, [value.lat, value.lng, areas]);

  const applyChange = (v: AddressValue) => {
    const insideNow =
      v.lat != null && v.lng != null && areas.length > 0
        ? isInsideAnyArea(v.lat, v.lng, areas)
        : null;
    onChange({ ...v, in_coverage: insideNow });
  };

  const detect = (highAccuracy = true) => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalización no disponible en este dispositivo");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const label = await reverseGeocode(latitude, longitude);
        applyChange({
          lat: latitude,
          lng: longitude,
          direccion: label ?? value.direccion,
          accuracy_m: accuracy ?? null,
          location_source: highAccuracy ? "gps" : "approx",
        });
        setDetecting(false);
        if (!label) toast.warning("Ubicación detectada, ajusta la dirección manualmente");
      },
      (err) => {
        setDetecting(false);
        const map: Record<number, string> = {
          1: "Permiso de ubicación denegado",
          2: "Ubicación no disponible ahora mismo",
          3: "Tiempo de espera agotado buscando ubicación",
        };
        toast.error(map[err.code] ?? err.message ?? "No se pudo obtener la ubicación");
        if (err.code === 1) setPermission("denied");
      },
      { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 15000 : 8000, maximumAge: 30000 }
    );
  };

  const pickSuggestion = (s: Suggestion) => {
    setQuery("");
    setOpenSuggest(false);
    applyChange({ lat: s.lat, lng: s.lng, direccion: s.label, location_source: "search", accuracy_m: null });
  };

  const onDragEnd = async () => {
    const m = markerRef.current;
    if (!m) return;
    const { lat, lng } = m.getLatLng();
    const label = await reverseGeocode(lat, lng);
    applyChange({ lat, lng, direccion: label ?? value.direccion, location_source: "map", accuracy_m: null });
  };

  const lowAccuracy = value.accuracy_m != null && value.accuracy_m > 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Dirección</Label>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => detect(true)}
            disabled={detecting || permission === "denied" || permission === "unavailable"}
          >
            {detecting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <LocateFixed className="h-3 w-3 mr-1" />}
            Usar mi ubicación
          </Button>
          {(lowAccuracy || permission === "denied") && (
            <Button type="button" size="sm" variant="ghost" onClick={() => detect(false)} disabled={detecting}>
              Aproximada
            </Button>
          )}
        </div>
      </div>

      {permission === "denied" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {permissionInstructions("denied")} Puedes continuar escribiendo la dirección manualmente.
          </AlertDescription>
        </Alert>
      )}

      <Textarea
        rows={2}
        value={value.direccion}
        onChange={(e) => applyChange({ ...value, direccion: e.target.value, location_source: value.location_source ?? "manual" })}
        placeholder="Calle, número, colonia, ciudad"
      />

      <Popover open={openSuggest && suggestions.length > 0} onOpenChange={setOpenSuggest}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar dirección (calle y número, colonia...)"
            />
            {searching && (
              <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[var(--radix-popover-trigger-width)] max-h-64 overflow-y-auto"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={i}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted border-b last:border-0"
              onClick={() => pickSuggestion(s)}
            >
              {s.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <div className="h-56 w-full overflow-hidden rounded-md border">
        <MapContainer
          center={center}
          zoom={value.lat != null ? 16 : 12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
          <Recenter lat={value.lat} lng={value.lng} />
          {showCoverage &&
            areas.map((a) => (
              <Circle
                key={a.id}
                center={[a.center_lat, a.center_lng]}
                radius={a.radius_m}
                pathOptions={{ color: "hsl(var(--primary))", fillOpacity: 0.08, weight: 1 }}
              />
            ))}
          {value.lat != null && value.lng != null && value.accuracy_m != null && value.accuracy_m > 0 && (
            <Circle
              center={[value.lat, value.lng]}
              radius={Math.min(value.accuracy_m, 500)}
              pathOptions={{ color: "hsl(var(--muted-foreground))", fillOpacity: 0.05, weight: 1, dashArray: "4" }}
            />
          )}
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

      <div className="flex flex-wrap gap-2 items-center">
        {value.lat != null && value.lng != null && (
          <p className="text-[11px] text-muted-foreground flex-1">
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)} · Arrastra el pin para ajustar
          </p>
        )}
        {value.accuracy_m != null && (
          <Badge variant={lowAccuracy ? "outline" : "secondary"} className="text-[10px]">
            ± {Math.round(value.accuracy_m)} m {lowAccuracy && "(baja precisión)"}
          </Badge>
        )}
        {showCoverage && inCoverage != null && (
          <Badge variant={inCoverage ? "default" : "outline"} className="text-[10px]">
            {inCoverage ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" />Dentro del área de servicio</>
            ) : (
              <><AlertCircle className="h-3 w-3 mr-1" />Fuera del área de servicio</>
            )}
          </Badge>
        )}
      </div>
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