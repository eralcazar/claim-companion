import { useActiveBranch } from "@/hooks/usePharmacyBranches";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store } from "lucide-react";

export function SucursalSelector({ className }: { className?: string }) {
  const { branchId, setBranchId, branches } = useActiveBranch();
  if (branches.length === 0) return null;
  return (
    <div className={"flex items-center gap-2 " + (className ?? "")}>
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select value={branchId ?? undefined} onValueChange={setBranchId}>
        <SelectTrigger className="h-9 w-[200px]">
          <SelectValue placeholder="Sucursal" />
        </SelectTrigger>
        <SelectContent>
          {branches.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.nombre}{b.es_principal ? " (principal)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}