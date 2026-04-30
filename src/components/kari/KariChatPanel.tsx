import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Plus, ShoppingCart, Loader2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useKariChat } from "@/hooks/useKariChat";
import { useKariBalance } from "@/hooks/useKariTokens";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import kariAvatar from "@/assets/kari-avatar.png";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTIONS = [
  "¿Qué significa colesterol LDL alto?",
  "Explícame para qué sirve el paracetamol",
  "¿Cuándo debo ir al médico por dolor de cabeza?",
  "Tips para mejorar mi sueño",
];

export function KariChatPanel({ open, onOpenChange }: Props) {
  const { messages, sendMessage, sending, error, newConversation } = useKariChat();
  const { data: balance } = useKariBalance();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || sending) return;
    sendMessage(t);
    setInput("");
  };

  const noTokens = (balance?.balance ?? 0) <= 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <img src={kariAvatar} alt="Kari" className="h-8 w-8 rounded-full object-cover" />
            <div className="flex-1 text-left">
              <div className="text-base font-semibold">Kari</div>
              <div className="text-xs text-muted-foreground font-normal">Asistente de salud · IA</div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {(balance?.balance ?? 0).toLocaleString("es-MX")}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <img src={kariAvatar} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 text-sm">
                  Hola, soy <strong>Kari</strong>. ¿Cómo te puedo ayudar hoy con tu salud?
                  <div className="text-xs text-muted-foreground mt-1">
                    Recuerda: no sustituyo a tu médico. Ante una emergencia llama al 911.
                  </div>
                </div>
              </div>
              <div className="grid gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    disabled={noTokens || sending}
                    className="text-left text-xs px-3 py-2 rounded-lg border hover:bg-muted transition-colors disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex items-start gap-2",
                m.role === "user" && "flex-row-reverse",
              )}
            >
              {m.role === "assistant" && (
                <img src={kariAvatar} alt="" className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted rounded-tl-sm prose prose-sm max-w-none dark:prose-invert",
                )}
              >
                {m.role === "assistant" ? (
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-start gap-2">
              <img src={kariAvatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 text-sm flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Kari está pensando…
              </div>
            </div>
          )}

          {error?.code === "insufficient_tokens" && (
            <div className="border border-warning/40 bg-warning/10 rounded-lg p-3 text-sm space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Sin tokens de IA
              </div>
              <p className="text-xs text-muted-foreground">{error.message}</p>
              <Button asChild size="sm" className="w-full">
                <Link to="/kari/tokens" onClick={() => onOpenChange(false)}>
                  <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                  Comprar tokens
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="border-t p-3 space-y-2">
          {noTokens && messages.length === 0 && (
            <div className="text-xs text-warning-foreground bg-warning/10 border border-warning/30 rounded px-2 py-1.5 text-center">
              Sin tokens. <Link to="/kari/tokens" className="underline" onClick={() => onOpenChange(false)}>Comprar paquete</Link>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={noTokens ? "Compra tokens para chatear…" : "Pregúntale a Kari…"}
              disabled={sending || noTokens}
              maxLength={4000}
            />
            <Button type="submit" size="icon" disabled={sending || noTokens || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={newConversation} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" />Nueva
            </Button>
            <Link to="/kari" onClick={() => onOpenChange(false)} className="text-xs text-muted-foreground hover:underline">
              Ver historial
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}