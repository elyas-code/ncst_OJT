import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Sparkles, X, Send, Loader2, Wand2, Zap, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: { name: string; args: any; ok: boolean }[];
}

const STORAGE_KEY = "ncst_ai_chat_v1";

export function AIAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load history from sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch {}
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  }, [messages, open, loading]);

  if (!user || user.role === "student") return null;

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const userMsg: ChatMessage = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${data.error ?? "Something went wrong"}` }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply ?? "(no response)", toolCalls: data.toolCalls }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Network error contacting the assistant." }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const reset = () => {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const suggestions = user.role === "admin" ? [
    "Show me the dashboard overview",
    "List all teachers",
    "How many unresolved alerts are there?",
  ] : [
    "What pending submissions do I have?",
    "Show me my courses",
    "Are there any active integrity alerts?",
  ];

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="ai-assistant-launcher"
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-2 pl-3 pr-4 py-3 rounded-full shadow-2xl gradient-primary text-white hover:scale-105 transition-transform"
        >
          <div className="relative">
            <Sparkles className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <span className="font-semibold text-sm">AI Assistant</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] flex flex-col rounded-2xl shadow-2xl border border-border bg-background overflow-hidden">
          {/* Header */}
          <div className="gradient-primary text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">NCST Assistant</p>
                <p className="text-[11px] text-white/80 leading-tight">
                  {user.role === "admin" ? "Admin co-pilot · full access" : "Teaching co-pilot"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={reset}
                  title="New conversation"
                  className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/20">
            {messages.length === 0 && (
              <div className="text-center mt-6">
                <div className="w-14 h-14 mx-auto rounded-2xl gradient-primary text-white flex items-center justify-center mb-3 shadow-lg">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-base">Hi {user.name.split(" ")[0]}, how can I help?</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4 px-4">
                  Ask me anything about your {user.role === "admin" ? "users, courses, and alerts" : "classes and students"}, or tell me what you'd like done.
                </p>
                <div className="space-y-1.5 px-2">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <Zap className="inline h-3 w-3 mr-1.5 text-primary" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble key={i} m={m} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 bg-background">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={loading ? "Thinking…" : "Ask or instruct the assistant…"}
                disabled={loading}
                rows={1}
                className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-32"
              />
              <Button
                size="icon"
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="gradient-primary text-white shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
              AI may make mistakes. Confirm important changes before relying on them.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
        isUser
          ? "bg-primary text-primary-foreground rounded-br-sm"
          : "bg-background border border-border rounded-bl-sm shadow-sm"
      }`}>
        {m.content}
        {!isUser && m.toolCalls && m.toolCalls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/60 space-y-0.5">
            {m.toolCalls.map((t, i) => (
              <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${t.ok ? "bg-emerald-500" : "bg-destructive"}`} />
                <span className="font-mono">{t.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
