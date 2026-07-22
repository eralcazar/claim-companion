import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ProLocation = {
  id: string;
  nombre: string | null;
  ciudad: string | null;
  direccion: string | null;
  es_principal: boolean;
  activo: boolean;
};

type Ctx = {
  locations: ProLocation[];
  activeLocationId: string | null;
  setActiveLocationId: (id: string | null) => void;
  hasMultipleLocations: boolean;
};

const ActiveLocationCtx = createContext<Ctx>({
  locations: [], activeLocationId: null, setActiveLocationId: () => {}, hasMultipleLocations: false,
});

const LS_KEY = "carecentral.active_location_id";

export function ActiveLocationProvider({ children }: { children: ReactNode }) {
  const { user, roles } = useAuth();
  const isPro = roles?.some((r) => ["medico", "nutricionista", "enfermero"].includes(r));
  const [activeLocationId, setActiveIdState] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null),
  );

  const { data: locations = [] } = useQuery({
    queryKey: ["my-locations", user?.id],
    enabled: !!user?.id && !!isPro,
    queryFn: async () => {
      const { data: pp } = await supabase.from("professional_profiles").select("id").eq("user_id", user!.id).maybeSingle();
      if (!pp) return [] as ProLocation[];
      const { data, error } = await supabase
        .from("professional_locations")
        .select("id, nombre, ciudad, direccion, es_principal, activo")
        .eq("professional_id", pp.id)
        .eq("activo", true)
        .order("es_principal", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProLocation[];
    },
  });

  const setActiveLocationId = (id: string | null) => {
    setActiveIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(LS_KEY, id);
      else localStorage.removeItem(LS_KEY);
    }
  };

  useEffect(() => {
    if (locations.length === 0) return;
    if (activeLocationId && locations.some((l) => l.id === activeLocationId)) return;
    const principal = locations.find((l) => l.es_principal) ?? locations[0];
    setActiveLocationId(principal.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  const value = useMemo(() => ({
    locations,
    activeLocationId,
    setActiveLocationId,
    hasMultipleLocations: locations.length > 1,
  }), [locations, activeLocationId]);

  return <ActiveLocationCtx.Provider value={value}>{children}</ActiveLocationCtx.Provider>;
}

export function useActiveLocation() { return useContext(ActiveLocationCtx); }