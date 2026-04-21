import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DoctorOption = {
  user_id: string;
  full_name: string;
  email: string;
};

export function useDoctors() {
  return useQuery({
    queryKey: ["doctors-list"],
    queryFn: async (): Promise<DoctorOption[]> => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "medico");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, first_name, paternal_surname, email")
        .in("user_id", ids);
      return (profiles ?? []).map((p: any) => ({
        user_id: p.user_id,
        full_name:
          p.full_name?.trim() ||
          [p.first_name, p.paternal_surname].filter(Boolean).join(" ") ||
          p.email ||
          "Sin nombre",
        email: p.email ?? "",
      }));
    },
  });
}