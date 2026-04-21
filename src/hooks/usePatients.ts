import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PatientOption = {
  user_id: string;
  full_name: string;
  email: string;
};

export function usePatients() {
  return useQuery({
    queryKey: ["patients-list"],
    queryFn: async (): Promise<PatientOption[]> => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "paciente");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, first_name, paternal_surname, email")
        .in("user_id", ids);
      return (profiles ?? [])
        .map((p: any) => ({
          user_id: p.user_id,
          full_name:
            p.full_name?.trim() ||
            [p.first_name, p.paternal_surname].filter(Boolean).join(" ") ||
            p.email ||
            "Sin nombre",
          email: p.email ?? "",
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });
}