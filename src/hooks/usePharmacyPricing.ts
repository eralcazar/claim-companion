import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePriceHistory(catalogId?: string | null) {
  return useQuery({
    queryKey: ['pharmacy_price_history', catalogId],
    enabled: !!catalogId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_price_history')
        .select('*')
        .eq('catalog_id', catalogId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCompetitorPrices(catalogId?: string | null) {
  return useQuery({
    queryKey: ['pharmacy_competitor_prices', catalogId],
    enabled: !!catalogId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_competitor_prices')
        .select('*')
        .eq('catalog_id', catalogId!)
        .order('captured_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddCompetitorPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      catalog_id: string;
      competidor: string;
      precio_centavos: number;
      url?: string;
      disponibilidad?: string;
    }) => {
      const { error } = await supabase
        .from('pharmacy_competitor_prices')
        .insert({ ...payload, fuente: 'manual' });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['pharmacy_competitor_prices', v.catalog_id] });
      toast.success('Precio de competencia registrado');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePriceChangeRequests() {
  return useQuery({
    queryKey: ['pharmacy_price_change_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_price_change_requests')
        .select('*, pharmacy_catalog(nombre, presentacion)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePriceChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      catalog_id: string;
      precio_actual_centavos: number;
      precio_propuesto_centavos: number;
      razon?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from('pharmacy_price_change_requests').insert({
        ...payload,
        requested_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy_price_change_requests'] });
      toast.success('Solicitud enviada');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReviewPriceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      approve,
      notas,
    }: {
      id: string;
      approve: boolean;
      notas?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (approve) {
        const { data: req, error: reqErr } = await supabase
          .from('pharmacy_price_change_requests')
          .select('*')
          .eq('id', id)
          .single();
        if (reqErr) throw reqErr;
        const { error: updErr } = await supabase
          .from('pharmacy_catalog')
          .update({ precio_centavos: req.precio_propuesto_centavos })
          .eq('id', req.catalog_id);
        if (updErr) throw updErr;
      }

      const { error } = await supabase
        .from('pharmacy_price_change_requests')
        .update({
          estado: approve ? 'aprobado' : 'rechazado',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          notas_revision: notas,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy_price_change_requests'] });
      qc.invalidateQueries({ queryKey: ['pharmacy_catalog'] });
      toast.success('Solicitud procesada');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useComparadorPublico(sku: string | undefined) {
  return useQuery({
    queryKey: ['comparador_publico', sku],
    enabled: !!sku,
    queryFn: async () => {
      const { data: producto, error } = await supabase
        .from('pharmacy_catalog')
        .select('id, nombre, presentacion, principio_activo, precio_centavos, imagen_url')
        .eq('sku', sku!)
        .maybeSingle();
      if (error) throw error;
      if (!producto) return null;

      const { data: competencia } = await supabase
        .from('pharmacy_competitor_prices')
        .select('competidor, precio_centavos, url, captured_at, disponibilidad')
        .eq('catalog_id', producto.id)
        .order('precio_centavos', { ascending: true });

      return { producto, competencia: competencia ?? [] };
    },
  });
}