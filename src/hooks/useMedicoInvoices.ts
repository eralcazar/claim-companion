import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useMedicoInvoices(opts: { doctorId?: string; patientId?: string } = {}) {
  return useQuery({
    queryKey: ["medico_invoices", opts],
    queryFn: async () => {
      let q = supabase.from("medico_invoices" as any).select("*").order("created_at", { ascending: false });
      if (opts.doctorId) q = q.eq("doctor_id", opts.doctorId);
      if (opts.patientId) q = q.eq("patient_id", opts.patientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useUpsertInvoice() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("medico_invoices" as any).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("medico_invoices" as any).insert({
          ...payload,
          doctor_id: payload.doctor_id ?? user!.id,
          folio: payload.folio ?? "",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medico_invoices"] });
      toast.success("Factura guardada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medico_invoices" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medico_invoices"] });
      toast.success("Factura eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}