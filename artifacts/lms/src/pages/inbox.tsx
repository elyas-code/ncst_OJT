import React, { useState, useEffect, useRef } from "react";
import { useThreads, useThread, useSendMessage, useContacts } from "../lib/api-extra";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Send, UserPlus, Search, Inbox as InboxIcon } from "lucide-react";

function rel(d: string | Date) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

function Avatar({ name, role, size = 9 }: { name?: string; role?: string; size?: number }) {
  const initial = (name?.charAt(0) ?? "?").toUpperCase();
  const colors: Record<string, string> = { admin: "bg-violet-500", teacher: "bg-emerald-500", student: "bg-blue-500" };
  const sizeCls = size === 9 ? "w-9 h-9 text-sm" : "w-11 h-11 text-base";
  return (
    <div className={`${sizeCls} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${colors[role ?? ""] ?? "bg-slate-500"}`}>
      {initial}
    </div>
  );
}

export default function Inbox() {
  const { user } = useAuth();
  const { data: threads, isLoading } = useThreads();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeName, setActiveName] = useState<string>("");
  const [activeRole, setActiveRole] = useState<string>("");

  function openThread(t: any) {
    setActiveId(t.partnerId);
    setActiveName(t.partnerName);
    setActiveRole(t.partnerRole);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><InboxIcon className="h-6 w-6" />Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">Direct messages with teachers, students, and admins.</p>
        </div>
        <NewMessageDialog onStart={(p) => { setActiveId(p.id); setActiveName(p.name); setActiveRole(p.role); }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)]">
        {/* Threads list */}
        <Card className="overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading && <div className="p-3 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>}
            {!isLoading && !threads?.length && (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start one with the button above.</p>
              </div>
            )}
            {threads?.map((t: any) => (
              <button key={t.partnerId} onClick={() => openThread(t)}
                className={`w-full px-3 py-3 border-b border-border text-left hover:bg-muted/50 transition-colors flex items-start gap-3
                  ${activeId === t.partnerId ? "bg-muted" : ""}`}>
                <Avatar name={t.partnerName} role={t.partnerRole} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{t.partnerName}</p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{rel(t.lastAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{t.lastBody}</p>
                </div>
                {t.unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] flex-shrink-0">{t.unreadCount}</Badge>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Active thread */}
        <Card className="overflow-hidden flex flex-col">
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Pick a conversation or start a new one</p>
              </div>
            </div>
          ) : (
            <ChatPane partnerId={activeId} partnerName={activeName} partnerRole={activeRole} myId={user!.id} />
          )}
        </Card>
      </div>
    </div>
  );
}

function ChatPane({ partnerId, partnerName, partnerRole, myId }: { partnerId: number; partnerName: string; partnerRole: string; myId: number }) {
  const { data: msgs, isLoading } = useThread(partnerId);
  const send = useSendMessage();
  const [body, setBody] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [msgs?.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    send.mutate({ recipientId: partnerId, body: body.trim() }, { onSuccess: () => setBody("") });
  }

  return (
    <>
      <div className="p-3 border-b border-border flex items-center gap-3">
        <Avatar name={partnerName} role={partnerRole} />
        <div>
          <p className="font-semibold text-sm">{partnerName}</p>
          <Badge variant="outline" className="text-[10px] capitalize">{partnerRole}</Badge>
        </div>
      </div>
      <div ref={scroller} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {isLoading && <Skeleton className="h-20" />}
        {msgs?.map((m: any) => {
          const mine = m.senderId === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-md px-3 py-2 rounded-2xl text-sm
                ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white border border-border rounded-bl-sm"}`}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        {!msgs?.length && !isLoading && (
          <p className="text-center text-sm text-muted-foreground py-8">Send the first message ↓</p>
        )}
      </div>
      <form onSubmit={submit} className="p-3 border-t border-border flex gap-2">
        <Textarea value={body} onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as any); } }}
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
          rows={1} className="resize-none min-h-10" />
        <Button type="submit" disabled={send.isPending || !body.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}

function NewMessageDialog({ onStart }: { onStart: (p: { id: number; name: string; role: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data } = useContacts(q);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><UserPlus className="h-4 w-4 mr-1" />New message</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Start a conversation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email..." className="pl-9" />
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {data?.map((u: any) => (
              <button key={u.id} onClick={() => { onStart({ id: u.id, name: u.name, role: u.role }); setOpen(false); }}
                className="w-full p-2.5 text-left hover:bg-muted/50 rounded transition-colors flex items-center gap-3">
                <Avatar name={u.name} role={u.role} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">{u.role}</Badge>
              </button>
            ))}
            {!data?.length && <p className="text-sm text-muted-foreground text-center py-6">No contacts found</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
