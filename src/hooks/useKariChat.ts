import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tokens_used?: number;
  created_at?: string;
};

export function useKariConversations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["kari_conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_chat_conversations")
        .select("id, title, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useDeleteKariConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      // Cascade en FK borra automáticamente los mensajes asociados.
      const { error } = await supabase
        .from("ai_chat_conversations")
        .delete()
        .eq("id", conversationId);
      if (error) throw error;
      return conversationId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kari_conversations"] });
      toast.success("Conversación eliminada");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo eliminar"),
  });
}

export function useKariChat() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  // Cargar mensajes de una conversación seleccionada
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("ai_chat_messages")
        .select("id, role, content, tokens_used, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as ChatMessage[]);
    })();
  }, [conversationId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!user || !text.trim()) return;
      setError(null);
      setSending(true);

      const optimisticUser: ChatMessage = {
        id: `tmp-${Date.now()}`,
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, optimisticUser]);

      try {
        const { data, error: invokeErr } = await supabase.functions.invoke("ai-kari-chat", {
          body: { conversation_id: conversationId, message: text },
        });

        if (invokeErr) {
          // FunctionsError: status code may be in context
          const ctx: any = (invokeErr as any).context;
          let payload: any = null;
          try {
            payload = ctx ? await ctx.json() : null;
          } catch {}
          const code = payload?.code;
          const errMsg = payload?.error || invokeErr.message || "Error al hablar con Kari";
          if (code === "insufficient_tokens") {
            setError({ code, message: errMsg });
            toast.error("Sin tokens de IA", { description: "Compra un paquete para seguir." });
          } else if (code === "rate_limited") {
            toast.error("Kari está saturada, intenta en unos segundos.");
          } else {
            toast.error(errMsg);
          }
          setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
          return;
        }

        const newConvId = data?.conversation_id as string;
        if (newConvId && newConvId !== conversationId) setConversationId(newConvId);

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticUser.id),
          { ...optimisticUser, id: `u-${Date.now()}` },
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data?.assistant ?? "",
            tokens_used: data?.tokens_used,
          },
        ]);

        qc.invalidateQueries({ queryKey: ["kari_conversations"] });
        qc.invalidateQueries({ queryKey: ["kari_balance"] });
      } catch (e: any) {
        toast.error(e.message ?? "Error al hablar con Kari");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      } finally {
        setSending(false);
      }
    },
    [user, conversationId, qc],
  );

  const newConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  return {
    conversationId,
    setConversationId,
    messages,
    sendMessage,
    sending,
    error,
    newConversation,
  };
}