import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ClaimFormData } from "./types";

interface Policy {
  id: string;
  policy_number: string;
  company: string;
}

interface Profile {
  full_name: string;
  rfc?: string | null;
  curp?: string | null;
  phone?: string | null;
  email?: string | null;
  street?: string | null;
  street_number?: string | null;
  neighborhood?: string | null;
  municipality?: string | null;
  state?: string | null;
  postal_code?: string | null;
}

interface Props {
  form: ClaimFormData;
  onChange: (updates: Partial<ClaimFormData>) => void;
  policies: Policy[];
  profile: Profile | null;
  selectedPolicy: Policy | undefined;
}

export default function StepPolicySelect({ form, onChange, policies, profile, selectedPolicy }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Póliza</Label>
        <Select value={form.policy_id} onValueChange={(v) => onChange({ policy_id: v })}>
          <SelectTrigger><SelectValue placeholder="Selecciona póliza" /></SelectTrigger>
          <SelectContent>
            {policies.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.company} — {p.policy_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPolicy && (
        <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
          <p className="font-medium text-foreground">Datos del paciente</p>
          <p><strong>Nombre:</strong> {profile?.full_name}</p>
          <p><strong>RFC:</strong> {profile?.rfc || "—"}</p>
          <p><strong>Aseguradora:</strong> {selectedPolicy.company}</p>
          <p><strong>Póliza:</strong> {selectedPolicy.policy_number}</p>
        </div>
      )}
    </div>
  );
}
