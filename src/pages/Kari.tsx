import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Send, Plus, ShoppingCart, MessageSquare, AlertTriangle, Loader2, Search, Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useKariChat, useKariConversations, useDeleteKariConversation } from "@/hooks/useKariChat";
import { useKariBalance } from "@/hooks/useKariTokens";
import { cn } from "@/lib/utils";
import kariAvatar from "@/assets/kari-avatar.png";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Kari() {
  const { conversationId, setConversationId, messages, sendMessage, sending, error, newConversation } = useKariChat();
  const { data: conversations = [] } = useKariConversations();
  const { data: balance } = useKariBalance();
  const deleteConv = useDeleteKariConversation();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  const tokens = balance?.balance ?? 0;
  const noTokens = tokens <= 0;

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c: any) => (c.title ?? "").toLowerCase().includes(q));
  }, [conversations, search]);

  const handleSend = (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || sending) return;
    sendMessage(t);
    setInput("");
  };

  return (
    <div className="container max-w-6xl py-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <img src={kariAvatar} alt="Kari" className="h-12 w-12 rounded-full object-cover" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">Kari</h1>
            <p className="text-sm text-muted-foreground">Asistente de salud con IA · No sustituye consulta médica</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {tokens.toLocaleString("es-MX")} tokens
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link to="/kari/tokens">
              <ShoppingCart className="h-4 w-4 mr-1" />Comprar tokens
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <Card className="h-fit">
          <CardContent className="p-3 space-y-2">
            <Button onClick={newConversation} variant="default" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" />Nueva conversación
            </Button>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="pl-7 h-8 text-xs"
              />
            </div>
            <div className="text-xs font-semibold text-muted-foreground pt-2 px-1">Recientes</div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Sin conversaciones aún.</p>
              )}
              {conversations.length > 0 && filteredConversations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Sin coincidencias.</p>
              )}
              {filteredConversations.map((c: any) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-stretch rounded-md hover:bg-muted transition-colors",
                    conversationId === c.id && "bg-muted",
                  )}
                >
                  <button
                    onClick={() => setConversationId(c.id)}
                    className="flex-1 text-left text-xs px-2 py-2 min-w-0"
                  >
                    <div className="truncate flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 flex-shrink-0" />
                      <span className={cn("truncate", conversationId === c.id && "font-medium")}>
                        {c.title}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true, locale: es })}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete({ id: c.id, title: c.title });
                    }}
                    className="px-2 opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    aria-label={`Eliminar ${c.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[70vh]">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex items-start gap-2">
                <img src={kariAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 text-sm">
                  Hola, soy <strong>Kari</strong>. ¿Cómo te puedo ayudar hoy con tu salud?
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex items-start gap-2", m.role === "user" && "flex-row-reverse")}>
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />Pensando…
                </div>
              </div>
            )}
            {error?.code === "insufficient_tokens" && (
              <div className="border border-warning/40 bg-warning/10 rounded-lg p-3 text-sm space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />Sin tokens
                </div>
                <Button asChild size="sm">
                  <Link to="/kari/tokens"><ShoppingCart className="h-3.5 w-3.5 mr-1" />Comprar tokens</Link>
                </Button>
              </div>
            )}
          </CardContent>
          <div className="border-t p-3">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
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
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              ⚠️ Información orientativa. No sustituye consulta médica. Emergencia: 911.
            </p>
          </div>
        </Card>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente <strong>"{pendingDelete?.title}"</strong> y todos sus
              mensajes. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!pendingDelete) return;
                const wasActive = pendingDelete.id === conversationId;
                await deleteConv.mutateAsync(pendingDelete.id);
                setPendingDelete(null);
                if (wasActive) newConversation();
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}