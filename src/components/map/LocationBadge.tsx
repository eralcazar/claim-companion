import { MapPin } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { RouteMap } from "./RouteMap";

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
};

export function LocationBadge({ latitude, longitude, accuracy }: Props) {
  if (latitude == null || longitude == null) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-xs">Ubicación</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <RouteMap points={[{ latitude, longitude }]} height={160} showStartEnd />
        <p className="text-xs text-muted-foreground mt-2">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
          {accuracy != null && <> · ±{Math.round(accuracy)} m</>}
        </p>
      </PopoverContent>
    </Popover>
  );
}