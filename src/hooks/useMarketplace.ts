import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Specialty = {
  id: string;
  slug: string;
  nombre: string;
  nombre_plural: string | null;
  sinonimos: string[] | null;
  icono: string | null;
};

export type ProfessionalCard = {
  id: string;
  slug: string;
  display_name: string;
  titulo: string | null;
  tipo: string;
  bio: string | null;
  foto_url: string | null;
  anos_experiencia: number | null;
  idiomas: string[] | null;
  seguros_aceptados: string[] | null;
  precio_consulta_centavos: number | null;
  acepta_video: boolean;
  acepta_domicilio: boolean;
  acepta_presencial: boolean;
  rating_avg: number;
  rating_count: number;
  verificado: boolean;
  professional_specialties: { specialty: Specialty }[];
  professional_locations: {
    id: string;
    ciudad: string;
    direccion: string;
    es_principal: boolean;
  }[];
};

export function useSpecialties() {
  return useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specialties")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return (data ?? []) as Specialty[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

type SearchParams = {
  q?: string;
  ciudad?: string;
  specialtySlug?: string;
  soloVideo?: boolean;
  soloDomicilio?: boolean;
  soloPresencial?: boolean;
  conDisponibilidad?: boolean;
};

export function useSearchProfessionals(params: SearchParams) {
  return useQuery({
    queryKey: ["marketplace-search", params],
    queryFn: async () => {
      let query = supabase
        .from("professional_profiles")
        .select(
          `id, slug, display_name, titulo, tipo, bio, foto_url, anos_experiencia,
           idiomas, seguros_aceptados, precio_consulta_centavos, acepta_video,
           acepta_domicilio, acepta_presencial, rating_avg, rating_count, verificado,
           professional_specialties!inner(es_principal, specialty:specialties!inner(id, slug, nombre, nombre_plural, sinonimos, icono)),
           professional_locations(id, ciudad, direccion, es_principal)`
        )
        .eq("publicado", true)
        .order("rating_avg", { ascending: false })
        .order("rating_count", { ascending: false })
        .limit(50);

      if (params.q && params.q.trim().length >= 2) {
        query = query.ilike("display_name", `%${params.q.trim()}%`);
      }
      if (params.soloVideo) query = query.eq("acepta_video", true);
      if (params.soloDomicilio) query = query.eq("acepta_domicilio", true);
      if (params.soloPresencial) query = query.eq("acepta_presencial", true);
      if (params.specialtySlug) {
        query = query.eq("professional_specialties.specialty.slug", params.specialtySlug);
      }

      const { data, error } = await query;
      if (error) throw error;
      let result = (data ?? []) as unknown as ProfessionalCard[];

      if (params.ciudad && params.ciudad.trim().length > 1) {
        const c = params.ciudad.trim().toLowerCase();
        result = result.filter((p) =>
          p.professional_locations?.some((l) => l.ciudad?.toLowerCase().includes(c))
        );
      }

      if (params.conDisponibilidad && result.length > 0) {
        const ids = result.map((p) => p.id);
        const { data: avail } = await supabase
          .from("professional_availability")
          .select("professional_id")
          .in("professional_id", ids)
          .eq("activo", true);
        const withSlots = new Set((avail ?? []).map((a: any) => a.professional_id));
        result = result.filter((p) => withSlots.has(p.id));
      }
      return result;
    },
  });
}

export function useProfessionalBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["professional", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_profiles")
        .select(
          `*,
           professional_specialties(es_principal, specialty:specialties(*)),
           professional_locations(*)`
        )
        .eq("slug", slug!)
        .eq("publicado", true)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useProfessionalReviews(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["professional-reviews", professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_reviews")
        .select("id, rating, puntualidad, trato, claridad, comentario, respuesta_profesional, created_at")
        .eq("professional_id", professionalId!)
        .eq("publicada", true)
        .eq("reportada", false)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}