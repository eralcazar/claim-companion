import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCurrentPosSession(branchId?: string | null) {
  return useQuery({
    queryKey: ['pos_current_session', branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('pos_sessions')
        .select('*')
        .eq('cajero_id', user.id)
        .eq('branch_id', branchId!)
        .eq('estado', 'abierta')
        .order('abierta_at', { ascending: false })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useOpenSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { branchId: string; fondo: number; notas?: string }) => {
      const { data, error } = await supabase.rpc('pos_open_session', {
        _branch_id: payload.branchId,
        _fondo_inicial: Math.round(payload.fondo * 100),
        _notas: payload.notas ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos_current_session'] });
      toast.success('Caja abierta');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCloseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { sessionId: string; fondoFinal: number; notas?: string }) => {
      const { data, error } = await supabase.rpc('pos_close_session', {
        _session_id: payload.sessionId,
        _fondo_final: Math.round(payload.fondoFinal * 100),
        _notas: payload.notas ?? null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos_current_session'] });
      toast.success('Caja cerrada');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSearchPosCustomers(term: string) {
  return useQuery({
    queryKey: ['pos_customers_search', term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_customers')
        .select('*')
        .or(`nombre.ilike.%${term}%,telefono.ilike.%${term}%,rfc.ilike.%${term}%`)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertPosCustomer() {
  return useMutation({
    mutationFn: async (payload: {
      nombre: string;
      telefono?: string;
      email?: string;
      rfc?: string;
      uso_cfdi?: string;
      regimen_fiscal?: string;
      cp?: string;
    }) => {
      const { data, error } = await supabase
        .from('pos_customers')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export type CartLine = {
  catalog_id: string;
  nombre: string;
  presentacion?: string | null;
  precio_centavos: number;
  iva_pct: number;
  cantidad: number;
  lote_id?: string;
  costo_unitario_centavos: number;
  codigo_sat?: string | null;
};

export function useCreatePosSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      branchId: string;
      customerId?: string | null;
      cliente_nombre?: string;
      cliente_rfc?: string;
      cliente_email?: string;
      cliente_cp?: string;
      uso_cfdi?: string;
      metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
      requiere_cfdi: boolean;
      lines: CartLine[];
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      if (!payload.lines.length) throw new Error('Carrito vacío');

      const subtotal = payload.lines.reduce(
        (s, l) => s + Math.round((l.precio_centavos * l.cantidad) / (1 + l.iva_pct / 100)),
        0,
      );
      const total = payload.lines.reduce((s, l) => s + l.precio_centavos * l.cantidad, 0);
      const iva = total - subtotal;

      // Assign FEFO lot per line
      const linesWithLots: (CartLine & { lote_id: string })[] = [];
      for (const line of payload.lines) {
        const { data: fefo, error } = await supabase.rpc('sugerir_lotes_fefo', {
          _catalog_id: line.catalog_id,
          _branch_id: payload.branchId,
          _cantidad: line.cantidad,
        });
        if (error) throw error;
        if (!fefo || fefo.length === 0)
          throw new Error(`Sin stock disponible para ${line.nombre}`);
        // If FEFO returns multiple lots, split into separate lines
        let taken = 0;
        for (const lot of fefo) {
          const cant = Math.min(lot.cantidad_a_tomar, line.cantidad - taken);
          if (cant <= 0) continue;
          linesWithLots.push({
            ...line,
            cantidad: cant,
            lote_id: lot.lot_id,
            costo_unitario_centavos: lot.costo_unitario_centavos,
          });
          taken += cant;
          if (taken >= line.cantidad) break;
        }
        if (taken < line.cantidad) throw new Error(`Stock insuficiente para ${line.nombre}`);
      }

      const { data: order, error: orderErr } = await supabase
        .from('pharmacy_orders')
        .insert({
          branch_id: payload.branchId,
          patient_id: user.id,
          created_by: user.id,
          tipo: 'pos',
          status: 'pagada',
          subtotal_centavos: subtotal,
          iva_centavos: iva,
          total_centavos: total,
          descuento_centavos: 0,
          metodo_pago: payload.metodo_pago,
          requiere_cfdi: payload.requiere_cfdi,
          cliente_nombre: payload.cliente_nombre ?? null,
          cliente_rfc: payload.cliente_rfc ?? null,
          cliente_email: payload.cliente_email ?? null,
          cliente_cp: payload.cliente_cp ?? null,
          uso_cfdi: payload.uso_cfdi ?? null,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const itemsPayload = linesWithLots.map((l) => {
        const lineTotal = l.precio_centavos * l.cantidad;
        const lineSubtotal = Math.round(lineTotal / (1 + l.iva_pct / 100));
        return {
          order_id: order.id,
          catalog_id: l.catalog_id,
          lote_id: l.lote_id,
          cantidad: l.cantidad,
          precio_unitario_centavos: l.precio_centavos,
          subtotal_centavos: lineSubtotal,
          iva_pct: l.iva_pct,
          costo_unitario_centavos: l.costo_unitario_centavos,
          nombre_snapshot: l.nombre,
          presentacion_snapshot: l.presentacion ?? null,
          codigo_sat: l.codigo_sat ?? null,
        };
      });
      const { error: itemsErr } = await supabase
        .from('pharmacy_order_items')
        .insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy_lots'] });
      qc.invalidateQueries({ queryKey: ['pos_current_session'] });
      toast.success('Venta registrada');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}