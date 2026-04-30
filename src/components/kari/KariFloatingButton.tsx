import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useKariBalance } from "@/hooks/useKariTokens";
import { KariChatPanel } from "./KariChatPanel";
import kariAvatar from "@/assets/kari-avatar.png";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const HIDDEN_ROUTES = ["/login", "/legal", "/kari", "/kari/tokens", "/checkout/return"];

export function KariFloatingButton() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const { data: balance } = useKariBalance();

  if (!user) return null;
  if (HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r))) return null;

  const tokens = balance?.balance ?? 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-40 right-4 bottom-20 md:bottom-6 group",
          "rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105",
          "bg-gradient-to-br from-primary to-accent p-1",
        )}
        aria-label="Pregúntale a Kari"
      >
        <div className="relative bg-background rounded-full p-1.5">
          <img
            src={kariAvatar}
            alt="Kari"
            className="h-12 w-12 rounded-full object-cover"
          />
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 flex items-center gap-0.5 shadow">
            <Sparkles className="h-2.5 w-2.5" />
            {tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens}
          </span>
        </div>
        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-foreground text-background text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Pregúntale a Kari
        </div>
      </button>
      <KariChatPanel open={open} onOpenChange={setOpen} />
    </>
  );
}