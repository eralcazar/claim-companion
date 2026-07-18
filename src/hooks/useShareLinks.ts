import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ShareResourceType = "appointment" | "receta" | "estudio" | "claim" | "format";

export interface ShareLink {
  id: string;
  owner_id: string;
  resource_type: ShareResourceType;
  resource_id: string;
  token: string;
  expires_at: string | null;
  revoked_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function useResourceShareLinks(resourceType: ShareResourceType, resourceId?: string) {
  return useQuery({
    queryKey: ["share-links", resourceType, resourceId],
    enabled: !!resourceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("share_links" as any)
        .select("*")
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ShareLink[];
    },
  });
}

export function useCreateShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      resourceType: ShareResourceType;
      resourceId: string;
      expiresInDays: number | null; // null = sin expiración
      note?: string;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const owner = userRes.user?.id;
      if (!owner) throw new Error("Sesión requerida");
      const days = input.expiresInDays;
      if (days !== null && (days < 1 || days > 30)) {
        throw new Error("La expiración debe ser entre 1 y 30 días");
      }
      const expiresAt = days === null ? null : new Date(Date.now() + days * 86400_000).toISOString();
      const { data, error } = await supabase
        .from("share_links" as any)
        .insert({
          owner_id: owner,
          resource_type: input.resourceType,
          resource_id: input.resourceId,
          expires_at: expiresAt,
          note: input.note ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as ShareLink;
    },
    onSuccess: (link) => {
      qc.invalidateQueries({ queryKey: ["share-links", link.resource_type, link.resource_id] });
      toast.success("Enlace generado");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo crear el enlace"),
  });
}

export function useRevokeShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("share_links" as any)
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["share-links"] });
      toast.success("Enlace revocado");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo revocar"),
  });
}

export function useUpdateShareLinkExpiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; expiresInDays: number | null }) => {
      const days = input.expiresInDays;
      if (days !== null && (days < 1 || days > 30)) {
        throw new Error("La expiración debe ser entre 1 y 30 días");
      }
      const expiresAt = days === null ? null : new Date(Date.now() + days * 86400_000).toISOString();
      const { error } = await supabase
        .from("share_links" as any)
        .update({ expires_at: expiresAt })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["share-links"] });
      toast.success("Expiración actualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });
}

export function buildShareUrl(token: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/s/${encodeURIComponent(token)}`;
}

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}