import React, { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useDiscussions, useCreateDiscussion, useDiscussion, useDiscussionReplies, useReplyDiscussion, useDeleteDiscussion } from "../lib/api-extra";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Pin, Lock, Plus, Trash2, ChevronRight, Reply } from "lucide-react";

function rel(d: string | Date) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

function Avatar({ name, role }: { name?: string; role?: string }) {
  const initial = (name?.charAt(0) ?? "?").toUpperCase();
  const colors: Record<string, string> = {
    admin: "bg-violet-500", teacher: "bg-emerald-500", student: "bg-blue-500",
  };
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${colors[role ?? ""] ?? "bg-slate-500"}`}>
      {initial}
    </div>
  );
}

/* ─── List page (per course) ─── */
export default function DiscussionsPage() {
  const [, params] = useRoute("/courses/:courseId/discussions");
  const courseId = params?.courseId ? parseInt(params.courseId) : 0;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data, isLoading } = useDiscussions(courseId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/courses/${courseId}`} className="hover:text-foreground">Course</Link>
        <span>/</span>
        <span className="text-foreground">Discussions</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discussions</h1>
          <p className="text-sm text-muted-foreground mt-1">Class forum for questions, announcements and conversations.</p>
        </div>
        <NewDiscussionDialog courseId={courseId} canPin={user?.role === "teacher" || user?.role === "admin"} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : !data?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="font-medium">No discussions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start the conversation — post the first thread above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((d: any) => (
            <Card key={d.id} className="hover:shadow-sm hover:border-primary/30 cursor-pointer transition-all"
              onClick={() => navigate(`/courses/${courseId}/discussions/${d.id}`)}>
              <CardContent className="p-4 flex items-start gap-3">
                <Avatar name={d.authorName} role={d.authorRole} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {d.isPinned && <Pin className="h-3.5 w-3.5 text-amber-600" />}
                    {d.isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    <p className="font-semibold text-sm truncate">{d.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{d.body}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                    <span>{d.authorName}</span>
                    <span>&bull;</span>
                    <span>{rel(d.createdAt)}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{d.replyCount}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewDiscussionDialog({ courseId, canPin }: { courseId: number; canPin: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pin, setPin] = useState(false);
  const m = useCreateDiscussion(courseId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    m.mutate({ title, body, isPinned: pin }, {
      onSuccess: () => { setOpen(false); setTitle(""); setBody(""); setPin(false); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />New thread</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New discussion</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Body</Label><Textarea required rows={5} value={body} onChange={e => setBody(e.target.value)} /></div>
          {canPin && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={pin} onChange={e => setPin(e.target.checked)} className="rounded" />
              Pin to top
            </label>
          )}
          <DialogFooter><Button type="submit" disabled={m.isPending}>{m.isPending ? "Posting..." : "Post"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Discussion detail ─── */
export function DiscussionDetail() {
  const [, params] = useRoute("/courses/:courseId/discussions/:id");
  const courseId = params?.courseId ? parseInt(params.courseId) : 0;
  const id = params?.id ? parseInt(params.id) : 0;
  const { user } = useAuth();
  const { data: d, isLoading } = useDiscussion(id);
  const { data: replies } = useDiscussionReplies(id);
  const replyMut = useReplyDiscussion(id);
  const delMut = useDeleteDiscussion(courseId);
  const [, navigate] = useLocation();
  const [body, setBody] = useState("");
  const isMod = user?.role === "teacher" || user?.role === "admin";

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!d) return <p className="text-muted-foreground text-center py-20">Discussion not found.</p>;

  function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    replyMut.mutate({ body }, { onSuccess: () => setBody("") });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/courses/${courseId}/discussions`} className="hover:text-foreground">Discussions</Link>
        <span>/</span>
        <span className="text-foreground">{d.title}</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Avatar name={d.authorName} role={d.authorRole} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {d.isPinned && <Pin className="h-4 w-4 text-amber-600" />}
                <CardTitle className="text-lg">{d.title}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">{d.authorName} &bull; <Badge variant="outline" className="text-[10px] capitalize">{d.authorRole}</Badge> &bull; {rel(d.createdAt)}</p>
            </div>
            {isMod && (
              <Button size="sm" variant="ghost" className="text-destructive"
                onClick={() => { if (confirm("Delete this thread?")) delMut.mutate(id, { onSuccess: () => navigate(`/courses/${courseId}/discussions`) }); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{d.body}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />Replies ({replies?.length ?? 0})
        </h2>
        <div className="space-y-3">
          {replies?.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <Avatar name={r.authorName} role={r.authorRole} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{r.authorName}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{r.authorRole}</Badge>
                    <span className="text-xs text-muted-foreground">{rel(r.createdAt)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {!replies?.length && <p className="text-sm text-muted-foreground italic">Be the first to reply.</p>}
        </div>
      </div>

      {!d.isLocked && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={reply} className="space-y-3">
              <Label className="text-sm flex items-center gap-1"><Reply className="h-3.5 w-3.5" />Add a reply</Label>
              <Textarea rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your reply..." />
              <Button type="submit" size="sm" disabled={replyMut.isPending || !body.trim()}>
                {replyMut.isPending ? "Posting..." : "Reply"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
