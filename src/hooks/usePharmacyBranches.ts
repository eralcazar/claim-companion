import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

export type Branch = {
  id: string;
  nombre: string;
  codigo: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  cp: string | null;
  telefono: string | null;
  rfc_emisor: string | null;
  razon_social_emisor: string | null;
  regimen_fiscal: string | null;
  cp_expedicion: string | null;
  activo: boolean;
  es_principal: boolean;
};

export function useBranches(onlyActive = true) {
  return useQuery({
    queryKey: ["pharmacy_branches", { onlyActive }],
    queryFn: async () => {
      let q = supabase.from("pharmacy_branches").select("*").order("es_principal", { ascending: false }).order("nombre");
      if (onlyActive) q = q.eq("activo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Branch[];
    },
  });
}

export function useUpsertBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<Branch> & { nombre: string }) => {
      const payload = { ...row };
      const { data, error } = await supabase.from("pharmacy_branches").upsert(payload as any).select().single();
      if (error) throw error;
      return data as Branch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_branches"] });
      toast({ title: "Sucursal guardada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

const STORAGE_KEY = "cc.pharmacy.branch";

export function useActiveBranch() {
  const { data: branches } = useBranches();
  const [branchId, setBranchIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (!branchId && branches && branches.length > 0) {
      const principal = branches.find((b) => b.es_principal) ?? branches[0];
      setBranchIdState(principal.id);
      window.localStorage.setItem(STORAGE_KEY, principal.id);
    }
  }, [branches, branchId]);

  const setBranchId = (id: string) => {
    setBranchIdState(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  };

  const active = branches?.find((b) => b.id === branchId) ?? null;
  return { branchId, setBranchId, active, branches: branches ?? [] };
}