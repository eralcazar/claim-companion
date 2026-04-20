import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FeatureKey, AppRoleLite } from "@/lib/features";

export interface RolePermissionRow {
  role: AppRoleLite;
  feature_key: string;
  allowed: boolean;
}

export function useAllPermissions() {
  return useQuery({
    queryKey: ["role_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, feature_key, allowed");
      if (error) throw error;
      return (data ?? []) as RolePermissionRow[];
    },
  });
}

export function usePermissions() {
  const { roles, loading: authLoading } = useAuth();
  const { data, isLoading } = useAllPermissions();

  const allowedSet = new Set<string>();
  if (data) {
    for (const row of data) {
      if (row.allowed && roles.includes(row.role as AppRoleLite)) {
        allowedSet.add(row.feature_key);
      }
    }
  }

  const can = (feature: FeatureKey): boolean => {
    // Safety: admins always keep access to access_manager (avoid lock-out)
    if (feature === "access_manager" && roles.includes("admin")) return true;
    return allowedSet.has(feature);
  };

  return { can, loading: authLoading || isLoading, roles };
}