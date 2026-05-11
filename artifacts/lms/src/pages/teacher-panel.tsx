import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  useListCourses,
  useCreateCourse,
  useListCourseInvitations,
  useCreateCourseInvitation,
  useCancelInvitation,
  useListUsers,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import {
  Plus, BookOpen, Users, Mail, Copy, Check, X, Clock, ChevronRight,
  GraduationCap, Send, Trash2, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

export default function TeacherPanel() {
  const { user } = useAuth();
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [managingCourseId, setManagingCourseId] = useState<number | null>(null);

  const { data: allCourses, isLoading, refetch: refetchCourses } = useListCourses({ query: { enabled: !!user } as any });
  const myCourses = allCourses?.filter(c => c.teacherId === user?.id) ?? [];

  if (!user || (user.role !== "teacher" && user.role !== "admin")) return null;

  const managingCourse = myCourses.find(c => c.id === managingCourseId) ?? null;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teacher Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Create courses and manage student enrolments.</p>
        </div>
        <Button onClick={() => setShowCreateCourse(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Course
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "My Courses", value: myCourses.length, icon: BookOpen },
          { label: "Total Students", value: myCourses.reduce((s, c) => s + (c.enrollmentCount ?? 0), 0), icon: GraduationCap },
          { label: "Active Courses", value: myCourses.filter(c => c.isActive).length, icon: Check },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-xl font-bold leading-none">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Course list */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : myCourses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-base">No courses yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click "New Course" to create your first course.</p>
            <Button className="mt-4" onClick={() => setShowCreateCourse(true)}>Create Course</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {myCourses.map(course => (
            <CourseRow
              key={course.id}
              course={course}
              isManaging={managingCourseId === course.id}
              onManage={() => setManagingCourseId(managingCourseId === course.id ? null : course.id)}
            />
          ))}
        </div>
      )}

      {/* Create Course Dialog */}
      <CreateCourseDialog
        open={showCreateCourse}
        onClose={() => setShowCreateCourse(false)}
        onCreated={() => { refetchCourses(); setShowCreateCourse(false); }}
        teacherId={user.id}
      />

      {/* Manage Course Dialog */}
      {managingCourse && (
        <ManageCourseDialog
          course={managingCourse}
          onClose={() => setManagingCourseId(null)}
        />
      )}
    </div>
  );
}

function CourseRow({ course, isManaging, onManage }: { course: any; isManaging: boolean; onManage: () => void }) {
  const [, setLocation] = useLocation();
  return (
    <Card className="border border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{course.title}</span>
              <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{course.code}</span>
              <Badge variant={course.isActive ? "default" : "secondary"} className="text-xs">
                {course.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {course.enrollmentCount ?? 0} students</span>
              {course.semester && <span>{course.semester} {course.academicYear}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setLocation(`/courses/${course.id}`)}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
            </Button>
            <Button variant="outline" size="sm" onClick={onManage} className="gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Manage Invitations
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isManaging ? "rotate-90" : ""}`} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ManageCourseDialog({ course, onClose }: { course: any; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: invitations, refetch } = useListCourseInvitations(course.id, { query: { enabled: !!course.id } as any });
  const createInvitation = useCreateCourseInvitation();
  const cancelInvitation = useCancelInvitation();

  const getInviteLink = (token: string) => `${window.location.origin}/invite/${token}`;

  const handleCopyLink = (token: string, id: number) => {
    navigator.clipboard.writeText(getInviteLink(token)).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleInvite = () => {
    if (!email.trim()) return;
    createInvitation.mutate({ courseId: course.id, data: { email: email.trim().toLowerCase() } }, {
      onSuccess: (inv) => {
        refetch();
        setEmail("");
        // Auto-copy the link
        navigator.clipboard.writeText(getInviteLink(inv.token)).catch(() => {});
        toast({ title: "Invitation created", description: "Link copied to clipboard — share it with the student." });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? "Could not send invitation.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    });
  };

  const handleCancel = (id: number) => {
    cancelInvitation.mutate({ id }, {
      onSuccess: () => { refetch(); toast({ title: "Invitation cancelled" }); },
    });
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pending", variant: "secondary" },
    accepted: { label: "Accepted", variant: "default" },
    cancelled: { label: "Cancelled", variant: "destructive" },
    expired: { label: "Expired", variant: "outline" },
  };

  const pending = invitations?.filter(i => i.status === "pending") ?? [];
  const others = invitations?.filter(i => i.status !== "pending") ?? [];

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Manage Invitations — {course.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-1">
          {/* Invite form */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Invite a student by email</p>
              <p className="text-xs text-muted-foreground">
                Enter the student's email address. An invitation link will be generated — copy and share it with the student. When they click the link and sign in, they'll be automatically enrolled.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="student@ncst.edu.bh"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                  type="email"
                  className="flex-1"
                />
                <Button onClick={handleInvite} disabled={!email.trim() || createInvitation.isPending} className="gap-2">
                  <Send className="h-4 w-4" />
                  {createInvitation.isPending ? "Sending…" : "Generate Link"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending invitations */}
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Pending ({pending.length})</p>
              <div className="space-y-2">
                {pending.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {format(new Date(inv.expiresAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0 gap-1">
                      <Clock className="h-3 w-3" /> Pending
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0 gap-1.5"
                      onClick={() => handleCopyLink(inv.token, inv.id)}
                    >
                      {copiedId === inv.id ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy Link</>}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleCancel(inv.id)}
                      disabled={cancelInvitation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          {others.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">History</p>
              <div className="space-y-1.5">
                {others.map(inv => {
                  const cfg = statusConfig[inv.status] ?? statusConfig.pending;
                  return (
                    <div key={inv.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm flex-1 truncate text-muted-foreground">{inv.email}</span>
                      <Badge variant={cfg.variant} className="text-xs flex-shrink-0">{cfg.label}</Badge>
                      {inv.acceptedAt && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {format(new Date(inv.acceptedAt), "MMM d")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {invitations?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No invitations sent yet. Use the form above to invite students.
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Link href={`/courses/${course.id}`}>
            <Button variant="ghost" className="gap-1.5">
              <ExternalLink className="h-4 w-4" /> Go to Course
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateCourseDialog({ open, onClose, onCreated, teacherId }: {
  open: boolean; onClose: () => void; onCreated: () => void; teacherId: number;
}) {
  const { data: users } = useListUsers({ query: { enabled: true } as any });
  const { user } = useAuth();
  const teachers = users?.filter(u => u.role === "teacher" || u.role === "admin") ?? [];
  const createCourse = useCreateCourse();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "", code: "", description: "", semester: "Fall",
    academicYear: new Date().getFullYear().toString(),
    teacherId: teacherId.toString(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCourse.mutate({
      data: { ...form, teacherId: parseInt(form.teacherId) }
    } as any, {
      onSuccess: () => { toast({ title: "Course created" }); onCreated(); },
      onError: () => toast({ title: "Failed to create course", variant: "destructive" }),
    });
  };

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Course Title *</Label>
            <Input value={form.title} onChange={e => f("title", e.target.value)} placeholder="Introduction to Computer Science" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Course Code *</Label>
              <Input value={form.code} onChange={e => f("code", e.target.value)} placeholder="CS101" required />
            </div>
            {user?.role === "admin" && (
              <div className="space-y-1.5">
                <Label>Assigned Teacher</Label>
                <Select value={form.teacherId} onValueChange={v => f("teacherId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => f("description", e.target.value)} placeholder="Brief course overview…" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <Select value={form.semester} onValueChange={v => f("semester", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Fall", "Spring", "Summer"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Academic Year</Label>
              <Input value={form.academicYear} onChange={e => f("academicYear", e.target.value)} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createCourse.isPending || !form.title || !form.code}>
              {createCourse.isPending ? "Creating…" : "Create Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
