import { UserCog, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useNavigate } from "react-router-dom";

export function ImpersonationBanner() {
  const { actingAsPatientId, actingAsName, clearActingAs } = useImpersonation();
  const navigate = useNavigate();

  if (!actingAsPatientId) return null;

  const handleExit = () => {
    clearActingAs();
    navigate("/broker");
  };

  return (
    <div className="bg-warning/15 border-b border-warning/30 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <UserCog className="h-4 w-4 text-warning flex-shrink-0" />
        <span className="truncate">
          Operando en nombre de <strong>{actingAsName}</strong>
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={handleExit} className="flex-shrink-0">
        <X className="h-3 w-3 mr-1" /> Salir
      </Button>
    </div>
  );
}