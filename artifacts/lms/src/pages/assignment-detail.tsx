import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { useAssignment, useMySubmission, useSubmitAssignment, useAssignmentSubmissions, useGradeSubmission } from "../lib/api-extra";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle2, AlertCircle, FileText, Calendar, Award, Edit3, ExternalLink } from "lucide-react";

function fmt(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AssignmentDetail() {
  const [, params] = useRoute("/assignments/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  const { user } = useAuth();
  const { data: a, isLoading } = useAssignment(id);
  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!a) return <p className="text-muted-foreground text-center py-20">Assignment not found.</p>;

  const due = a.dueAt ? new Date(a.dueAt) : null;
  const overdue = due ? due < new Date() : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/courses/${a.courseId}`} className="hover:text-foreground">{a.courseName}</Link>
        <span>/</span>
        <span className="text-foreground">{a.title}</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-xl">{a.title}</CardTitle>
                <Badge variant="outline" className="text-xs">Assignment</Badge>
                {!a.isPublished && <Badge variant="secondary" className="text-xs">Draft</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{a.courseCode} &bull; {a.points} points</p>
            </div>
            <div className="text-right">
              <p className={`text-xs font-semibold flex items-center gap-1 justify-end ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                <Clock className="h-3.5 w-3.5" />Due {fmt(a.dueAt)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {a.description && <p className="text-sm">{a.description}</p>}
          {a.instructions && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Instructions</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{a.instructions}</p>
            </div>
          )}
          {a.attachmentUrl && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Reference file</p>
              <a href={a.attachmentUrl} download={a.attachmentName} target="_blank" rel="noopener noreferrer" className="inline-block">
                <Button size="sm" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />{a.attachmentName}
                  {a.attachmentSize ? <span className="ml-2 text-xs text-muted-foreground">({((a.attachmentSize/1024)|0)} KB)</span> : null}
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </a>
            </div>
          )}
          <div className="flex gap-3 text-xs text-muted-foreground">
            {a.allowText && <Badge variant="secondary">Text submission</Badge>}
            {a.allowFile && <Badge variant="secondary">File submission</Badge>}
          </div>
        </CardContent>
      </Card>

      {isTeacher ? <TeacherView assignment={a} /> : <StudentView assignment={a} />}
    </div>
  );
}

function StudentView({ assignment }: { assignment: any }) {
  const { data: sub, isLoading } = useMySubmission(assignment.id);
  const submitMut = useSubmitAssignment(assignment.id);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (sub) {
      setContent(sub.content ?? "");
      setFileUrl(sub.fileUrl ?? "");
      setFileName(sub.fileName ?? "");
      setFileSize(sub.fileSize ?? null);
    }
  }, [sub]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setError("Max file size is 8 MB"); return; }
    setError(null);
    setFileName(f.name); setFileSize(f.size);
    const r = new FileReader();
    r.onload = () => setFileUrl(typeof r.result === "string" ? r.result : "");
    r.readAsDataURL(f);
  }

  function submit() {
    if (!content && !fileUrl) { setError("Provide text or upload a file"); return; }
    submitMut.mutate({ content, fileUrl, fileName, fileSize }, {
      onSuccess: () => { setEditing(false); setError(null); },
      onError: (e: any) => setError(e?.message ?? "Submission failed"),
    });
  }

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;

  const hasSubmission = !!sub;
  const graded = sub?.gradedAt;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {hasSubmission ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
          {hasSubmission ? "Your submission" : "Submit your work"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {graded && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-emerald-900">Graded: {sub.grade} / {assignment.points}</span>
            </div>
            {sub.feedback && <p className="text-sm text-emerald-900/80 whitespace-pre-wrap">{sub.feedback}</p>}
            <p className="text-xs text-emerald-700/70 mt-2">Graded {fmt(sub.gradedAt)}</p>
          </div>
        )}

        {hasSubmission && !editing ? (
          <>
            {sub.content && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Text response</p>
                <p className="text-sm whitespace-pre-wrap p-3 bg-muted/30 rounded">{sub.content}</p>
              </div>
            )}
            {sub.fileUrl && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">File</p>
                <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />{sub.fileName} <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </a>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Submitted {fmt(sub.submittedAt)}</p>
            {!graded && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Edit3 className="h-3.5 w-3.5 mr-1" />Resubmit
              </Button>
            )}
          </>
        ) : (
          <>
            {assignment.allowText && (
              <div className="space-y-2">
                <Label>Text response</Label>
                <Textarea rows={6} value={content} onChange={e => setContent(e.target.value)}
                  placeholder="Type your answer here..." />
              </div>
            )}
            {assignment.allowFile && (
              <div className="space-y-2">
                <Label>Attach file (max 8 MB)</Label>
                <Input type="file" onChange={onFile} />
                {fileName && <p className="text-xs text-muted-foreground">Selected: {fileName} ({((fileSize ?? 0) / 1024).toFixed(0)} KB)</p>}
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={submit} disabled={submitMut.isPending}>
                {submitMut.isPending ? "Submitting..." : hasSubmission ? "Resubmit" : "Submit"}
              </Button>
              {hasSubmission && <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TeacherView({ assignment }: { assignment: any }) {
  const { data: subs, isLoading } = useAssignmentSubmissions(assignment.id);
  const gradeMut = useGradeSubmission(assignment.id);

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Submissions ({subs?.length ?? 0})</CardTitle>
      </CardHeader>
      <CardContent>
        {!subs?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No submissions yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {subs.map((s: any) => <SubmissionRow key={s.id} sub={s} maxPoints={assignment.points} onGrade={gradeMut.mutate} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SubmissionRow({ sub, maxPoints, onGrade }: { sub: any; maxPoints: number; onGrade: (v: any) => void }) {
  const [grade, setGrade] = useState<string>(sub.grade?.toString() ?? "");
  const [feedback, setFeedback] = useState<string>(sub.feedback ?? "");
  const [open, setOpen] = useState(false);

  return (
    <div className="py-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{sub.studentName}</p>
          <p className="text-xs text-muted-foreground">{sub.studentEmail} &bull; submitted {fmt(sub.submittedAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {sub.gradedAt ? (
            <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{sub.grade}/{maxPoints}</Badge>
          ) : (
            <Badge variant="outline">Ungraded</Badge>
          )}
          <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>{open ? "Hide" : "Review"}</Button>
        </div>
      </div>
      {open && (
        <div className="ml-2 mt-3 pl-4 border-l-2 border-border space-y-3">
          {sub.content && <p className="text-sm whitespace-pre-wrap p-3 bg-muted/30 rounded">{sub.content}</p>}
          {sub.fileUrl && (
            <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline"><FileText className="h-3.5 w-3.5 mr-1" />{sub.fileName}<ExternalLink className="h-3 w-3 ml-2" /></Button>
            </a>
          )}
          <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
            <div>
              <Label className="text-xs">Grade /{maxPoints}</Label>
              <Input type="number" value={grade} onChange={e => setGrade(e.target.value)} max={maxPoints} min={0} />
            </div>
            <div>
              <Label className="text-xs">Feedback</Label>
              <Textarea rows={2} value={feedback} onChange={e => setFeedback(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={() => onGrade({ submissionId: sub.id, grade: parseInt(grade) || 0, feedback })}>
            Save grade
          </Button>
        </div>
      )}
    </div>
  );
}
