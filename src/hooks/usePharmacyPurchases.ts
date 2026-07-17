import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PurchaseItemDraft = {
  descripcion: string;
  clave_sat?: string | null;
  catalog_id?: string | null;
  cantidad: number;
  costo_unitario_centavos: number;
  subtotal_centavos: number;
  iva_pct: number;
  lote?: string | null;
  caducidad?: string | null;
  ubicacion?: string | null;
};

export type PurchaseDraft = {
  branch_id: string;
  supplier_id?: string | null;
  supplier_rfc?: string | null;
  supplier_nombre: string;
  fecha?: string;
  fuente: 'manual' | 'cfdi_xml' | 'cfdi_pdf';
  cfdi_uuid?: string | null;
  cfdi_xml_path?: string | null;
  cfdi_pdf_path?: string | null;
  subtotal_centavos: number;
  iva_centavos: number;
  total_centavos: number;
  moneda?: string;
  notas?: string | null;
  items: PurchaseItemDraft[];
};

export function usePharmacyPurchases(branchId?: string | null) {
  return useQuery({
    queryKey: ['pharmacy_purchases', branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_purchases')
        .select('*, pharmacy_suppliers(razon_social)')
        .eq('branch_id', branchId!)
        .order('fecha', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePurchaseItems(purchaseId?: string | null) {
  return useQuery({
    queryKey: ['pharmacy_purchase_items', purchaseId],
    enabled: !!purchaseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacy_purchase_items')
        .select('*')
        .eq('purchase_id', purchaseId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useParseCfdiXml() {
  return useMutation({
    mutationFn: async (xml: string) => {
      const { data, error } = await supabase.functions.invoke('parse-cfdi-xml', {
        body: { xml },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: PurchaseDraft) => {
      if (!draft.items.length) throw new Error('Agrega al menos un producto');
      for (const it of draft.items) {
        if (!it.lote || !it.caducidad) {
          throw new Error(`Falta lote/caducidad en "${it.descripcion}"`);
        }
      }

      const { data: purchase, error } = await supabase
        .from('pharmacy_purchases')
        .insert({
          branch_id: draft.branch_id,
          supplier_id: draft.supplier_id ?? null,
          supplier_rfc: draft.supplier_rfc ?? null,
          supplier_nombre: draft.supplier_nombre,
          fecha: draft.fecha ?? new Date().toISOString(),
          fuente: draft.fuente,
          cfdi_uuid: draft.cfdi_uuid ?? null,
          cfdi_xml_path: draft.cfdi_xml_path ?? null,
          cfdi_pdf_path: draft.cfdi_pdf_path ?? null,
          subtotal_centavos: draft.subtotal_centavos,
          iva_centavos: draft.iva_centavos,
          total_centavos: draft.total_centavos,
          moneda: draft.moneda ?? 'MXN',
          notas: draft.notas ?? null,
          estado: 'borrador',
        })
        .select()
        .single();
      if (error) throw error;

      const itemsPayload = draft.items.map((it) => ({
        purchase_id: purchase.id,
        descripcion: it.descripcion,
        clave_sat: it.clave_sat ?? null,
        catalog_id: it.catalog_id ?? null,
        cantidad: it.cantidad,
        costo_unitario_centavos: it.costo_unitario_centavos,
        subtotal_centavos: it.subtotal_centavos,
        iva_pct: it.iva_pct,
        lote: it.lote,
        caducidad: it.caducidad,
        ubicacion: it.ubicacion ?? null,
      }));

      const { error: itemsErr } = await supabase
        .from('pharmacy_purchase_items')
        .insert(itemsPayload);
      if (itemsErr) throw itemsErr;
      return purchase;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy_purchases'] });
      toast.success('Compra registrada');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useApplyPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (purchaseId: string) => {
      const { data: purchase, error: pErr } = await supabase
        .from('pharmacy_purchases')
        .select('*')
        .eq('id', purchaseId)
        .single();
      if (pErr) throw pErr;
      if (purchase.estado === 'aplicada') throw new Error('Ya aplicada');

      const { data: items, error: iErr } = await supabase
        .from('pharmacy_purchase_items')
        .select('*')
        .eq('purchase_id', purchaseId);
      if (iErr) throw iErr;
      if (!items?.length) throw new Error('Sin partidas');

      for (const it of items) {
        if (!it.catalog_id) throw new Error(`Falta mapear "${it.descripcion}" al catálogo`);
        const catalogId: string = it.catalog_id;
        const loteTxt: string = it.lote ?? '';
        const caducidadTxt: string = it.caducidad ?? '';
        if (!loteTxt || !caducidadTxt) throw new Error(`Falta lote/caducidad en "${it.descripcion}"`);

        const { data: lot, error: lotErr } = await supabase
          .from('pharmacy_lots')
          .insert({
            catalog_id: catalogId,
            branch_id: purchase.branch_id,
            lote: loteTxt,
            caducidad: caducidadTxt,
            cantidad_inicial: it.cantidad,
            cantidad_actual: it.cantidad,
            costo_unitario_centavos: it.costo_unitario_centavos,
            proveedor_id: purchase.supplier_id,
            purchase_id: purchase.id,
          })
          .select()
          .single();
        if (lotErr) throw lotErr;

        await supabase.from('pharmacy_lot_movements').insert({
          lot_id: lot.id,
          catalog_id: catalogId,
          branch_id: purchase.branch_id,
          tipo: 'entrada',
          cantidad: it.cantidad,
          motivo: `Compra ${purchase.folio ?? purchase.id}`,
          referencia_tipo: 'pharmacy_purchase',
          referencia_id: purchase.id,
        });

        await supabase
          .from('pharmacy_purchase_items')
          .update({ lot_id: lot.id })
          .eq('id', it.id);
      }

      const { error: updErr } = await supabase
        .from('pharmacy_purchases')
        .update({ estado: 'aplicada', aplicada_at: new Date().toISOString() })
        .eq('id', purchaseId);
      if (updErr) throw updErr;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy_purchases'] });
      qc.invalidateQueries({ queryKey: ['pharmacy_lots'] });
      toast.success('Compra aplicada a inventario');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}