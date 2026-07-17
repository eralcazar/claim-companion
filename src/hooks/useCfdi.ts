import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCfdiConfigs() {
  return useQuery({
    queryKey: ["cfdi_config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cfdi_config" as any).select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useUpsertCfdiConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("cfdi_config" as any).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cfdi_config" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cfdi_config"] }); toast.success("Configuración guardada"); },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

export function useGlobalCfdiMode() {
  const { data } = useCfdiConfigs();
  const modes = new Set((data ?? []).filter((c: any) => c.activo).map((c: any) => c.modo));
  if (modes.size === 0) return "simulado" as const;
  if (modes.has("produccion") && !modes.has("sandbox")) return "produccion" as const;
  if (modes.has("sandbox") && !modes.has("produccion")) return "sandbox" as const;
  return "mixto" as const;
}

export function useTimbrarInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice_id: string) => {
      const { data, error } = await supabase.functions.invoke("cfdi-timbrar", { body: { invoice_id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["medico_invoices"] });
      const modo = data?.modo === "simulado" ? "SIMULADO" : data?.modo === "sandbox" ? "SANDBOX" : "PRODUCCIÓN";
      toast.success(`Timbrado (${modo}): ${data?.uuid?.substring(0, 8)}…`);
      if (data?.warning) toast.warning(`Aviso PAC: ${data.warning}`);
    },
    onError: (e: any) => toast.error(e.message ?? "Error al timbrar"),
  });
}

export async function downloadCfdiFile(storagePath: string, filename: string) {
  // storagePath viene como "cfdi-docs/<...>/factura.xml"
  const [bucket, ...rest] = storagePath.split("/");
  const key = rest.join("/");
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 300);
  if (error) { toast.error(error.message); return; }
  const a = document.createElement("a");
  a.href = data.signedUrl;
  a.download = filename;
  a.click();
}