import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink, Loader2 } from "lucide-react";

type Suggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

interface Props {
  value: string;
  lat?: number | null;
  lng?: number | null;
  onChange: (v: { address: string; lat: number | null; lng: number | null }) => void;
}

export function AddressAutocomplete({ value, lat, lng, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query || query.length < 4 || query === value) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { "Accept-Language": "es" } });
        const data: Suggestion[] = await res.json();
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, value]);

  const select = (s: Suggestion) => {
    onChange({ address: s.display_name, lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setQuery(s.display_name);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onChange({ address: e.target.value, lat: null, lng: null });
            }}
            onFocus={() => results.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder="Buscar dirección..."
            className="pl-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {lat != null && lng != null && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank")}
            title="Abrir en Google Maps"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => select(r)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-b-0"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}