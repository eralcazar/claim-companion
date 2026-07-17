import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PharmacyCustomer {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  rfc: string | null;
  uso_cfdi: string | null;
  regimen_fiscal: string | null;
  cp: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  limite_credito_centavos: number;
  dias_credito: number;
  saldo_centavos: number;
  activo: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerAging {
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
  total: number;
  vencido: number;
  proximo_vence: string | null;
}

export interface CustomerCharge {
  id: string;
  customer_id: string;
  order_id: string | null;
  branch_id: string | null;
  folio: string | null;
  monto_centavos: number;
  saldo_centavos: number;
  fecha: string;
  vence_el: string;
  notas: string | null;
  created_at: string;
}

export interface CustomerPayment {
  id: string;
  customer_id: string;
  charge_id: string | null;
  branch_id: string | null;
  folio: string | null;
  monto_centavos: number;
  metodo: string;
  referencia: string | null;
  fecha: string;
  notas: string | null;
  created_at: string;
}

export function usePharmacyCustomers(search = "") {
  return useQuery({
    queryKey: ["pharmacy-customers", search],
    queryFn: async () => {
      let q = supabase
        .from("pos_customers")
        .select("*")
        .order("nombre", { ascending: true })
        .limit(200);
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(`nombre.ilike.${term},rfc.ilike.${term},telefono.ilike.${term},email.ilike.${term}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PharmacyCustomer[];
    },
  });
}

export function usePharmacyCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["pharmacy-customer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("pos_customers").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as PharmacyCustomer | null;
    },
  });
}

export function useCustomerAging(id: string | undefined) {
  return useQuery({
    queryKey: ["pharmacy-customer-aging", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pharmacy_customer_aging", { _customer_id: id! });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as CustomerAging | undefined;
      return row ?? { bucket_0_30: 0, bucket_31_60: 0, bucket_61_90: 0, bucket_90_plus: 0, total: 0, vencido: 0, proximo_vence: null };
    },
  });
}

export function useCustomerCharges(id: string | undefined) {
  return useQuery({
    queryKey: ["pharmacy-customer-charges", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacy_customer_charges")
        .select("*")
        .eq("customer_id", id!)
        .order("vence_el", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CustomerCharge[];
    },
  });
}

export function useCustomerPayments(id: string | undefined) {
  return useQuery({
    queryKey: ["pharmacy-customer-payments", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacy_customer_payments")
        .select("*")
        .eq("customer_id", id!)
        .order("fecha", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as CustomerPayment[];
    },
  });
}

export function useCustomerOrders(id: string | undefined) {
  return useQuery({
    queryKey: ["pharmacy-customer-orders", id],
    enabled: !!id,
    queryFn: async () => {
      // pedidos ligados por cliente_email o vía cargos
      const { data: cust } = await supabase.from("pos_customers").select("email").eq("id", id!).maybeSingle();
      if (!cust?.email) return [];
      const { data, error } = await supabase
        .from("pharmacy_orders")
        .select("id, folio, status, total_centavos, created_at, cliente_nombre, tipo")
        .eq("cliente_email", cust.email)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PharmacyCustomer> & { id?: string }) => {
      const payload: any = { ...input };
      delete payload.saldo_centavos;
      delete payload.created_at;
      delete payload.updated_at;
      if (input.id) {
        const { data, error } = await supabase
          .from("pos_customers")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("pos_customers").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy-customers"] });
      toast.success("Cliente guardado");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });
}

export function useRegisterPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      customer_id: string;
      monto_centavos: number;
      metodo: string;
      referencia?: string;
      charge_id?: string | null;
      branch_id?: string | null;
      notas?: string;
      fecha?: string;
    }) => {
      const { data, error } = await supabase
        .from("pharmacy_customer_payments")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["pharmacy-customer", vars.customer_id] });
      qc.invalidateQueries({ queryKey: ["pharmacy-customer-aging", vars.customer_id] });
      qc.invalidateQueries({ queryKey: ["pharmacy-customer-charges", vars.customer_id] });
      qc.invalidateQueries({ queryKey: ["pharmacy-customer-payments", vars.customer_id] });
      qc.invalidateQueries({ queryKey: ["pharmacy-customers"] });
      toast.success("Abono registrado");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo registrar el abono"),
  });
}

export function useRegisterCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      customer_id: string;
      monto_centavos: number;
      vence_el: string;
      folio?: string;
      order_id?: string | null;
      branch_id?: string | null;
      notas?: string;
    }) => {
      const payload = { ...input, saldo_centavos: input.monto_centavos };
      const { data, error } = await supabase
        .from("pharmacy_customer_charges")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["pharmacy-customer", vars.customer_id] });
      qc.invalidateQueries({ queryKey: ["pharmacy-customer-aging", vars.customer_id] });
      qc.invalidateQueries({ queryKey: ["pharmacy-customer-charges", vars.customer_id] });
      qc.invalidateQueries({ queryKey: ["pharmacy-customers"] });
      toast.success("Cargo registrado");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo registrar el cargo"),
  });
}

export function formatMxn(centavos: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format((centavos ?? 0) / 100);
}