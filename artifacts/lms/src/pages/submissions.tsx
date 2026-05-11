import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  useListFileSubmissions,
  useCreateFileSubmission,
  useUpdateFileSubmission,
  useReviewFileSubmission,
} from "@workspace/api-client-react";
import { FileSubmission, FileSubmissionReviewInputStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useListCourses } from "@workspace/api-client-react";
import { FileText, Plus, CheckCircle, XCircle, Clock, RefreshCw, Eye, Upload, Edit } from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Pending Review", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  approved: { label: "Approved", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  revision_requested: { label: "Revision Needed", variant: "outline", icon: <RefreshCw className="h-3 w-3" /> },
};

export default function Submissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<FileSubmission | null>(null);
  const [reviewingSubmission, setReviewingSubmission] = useState<FileSubmission | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<FileSubmission | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: submissions, isLoading, refetch } = useListFileSubmissions(
    statusFilter !== "all" ? { status: statusFilter as any } : undefined,
    { query: { enabled: true } as any }
  );
  const { data: courses } = useListCourses({ query: { enabled: !!user } as any });

  const createMutation = useCreateFileSubmission();
  const updateMutation = useUpdateFileSubmission();
  const reviewMutation = useReviewFileSubmission();

  if (!user) return null;

  const filtered = submissions ?? [];
  const isReviewer = user.role === "teacher" || user.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isReviewer ? "Submission Review" : "My Submissions"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isReviewer
              ? "Review and provide feedback on student file submissions."
              : "Submit and track your assignment files."}
          </p>
        </div>
        {!isReviewer && (
          <Button onClick={() => setShowSubmitDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Submission
          </Button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Filter by status:</Label>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "rejected", "revision_requested"].map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="capitalize"
            >
              {s === "all" ? "All" : statusConfig[s]?.label ?? s}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats (reviewer only) */}
      {isReviewer && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["pending", "approved", "rejected", "revision_requested"].map(s => {
            const count = (submissions ?? []).filter(sub => sub.status === s).length;
            const cfg = statusConfig[s];
            return (
              <Card key={s}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{count}</span>
                    <Badge variant={cfg.variant} className="gap-1">{cfg.icon}{cfg.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Submissions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No submissions found</p>
            <p className="text-muted-foreground text-sm mt-1">
              {!isReviewer ? "Click 'New Submission' to submit your first file." : "No submissions match the current filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => {
            const cfg = statusConfig[sub.status];
            return (
              <Card key={sub.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{sub.title}</h3>
                          <Badge variant={cfg.variant} className="gap-1 flex-shrink-0">
                            {cfg.icon}{cfg.label}
                          </Badge>
                        </div>
                        {isReviewer && sub.studentName && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            By <span className="font-medium">{sub.studentName}</span>
                            {sub.studentEmail && <span className="text-xs ml-1">({sub.studentEmail})</span>}
                          </p>
                        )}
                        {sub.courseTitle && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {sub.courseCode} — {sub.courseTitle}
                          </p>
                        )}
                        {sub.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{sub.description}</p>
                        )}
                        {sub.reviewComment && (
                          <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                            <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Reviewer comment: </span>
                            {sub.reviewComment}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Submitted {format(new Date(sub.submittedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                          {sub.reviewedAt && sub.reviewerName && (
                            <span>· Reviewed by {sub.reviewerName} on {format(new Date(sub.reviewedAt), "MMM d, yyyy")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => setViewingSubmission(sub)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isReviewer && (sub.status === "pending" || sub.status === "revision_requested") && (
                        <Button variant="outline" size="sm" onClick={() => setEditingSubmission(sub)}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                      )}
                      {isReviewer && sub.status === "pending" && (
                        <Button size="sm" onClick={() => setReviewingSubmission(sub)}>
                          Review
                        </Button>
                      )}
                      {isReviewer && sub.status !== "pending" && (
                        <Button variant="outline" size="sm" onClick={() => setReviewingSubmission(sub)}>
                          Re-review
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Submit / Edit Dialog */}
      <SubmitDialog
        open={showSubmitDialog || !!editingSubmission}
        submission={editingSubmission}
        courses={courses ?? []}
        onClose={() => { setShowSubmitDialog(false); setEditingSubmission(null); }}
        onSubmit={async (data) => {
          if (editingSubmission) {
            await new Promise<void>((resolve, reject) => {
              updateMutation.mutate({ id: editingSubmission.id, data } as any, {
                onSuccess: () => { resolve(); refetch(); toast({ title: "Submission updated" }); setEditingSubmission(null); },
                onError: reject,
              });
            });
          } else {
            await new Promise<void>((resolve, reject) => {
              createMutation.mutate({ data } as any, {
                onSuccess: () => { resolve(); refetch(); toast({ title: "Submission created" }); setShowSubmitDialog(false); },
                onError: reject,
              });
            });
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* Review Dialog */}
      {reviewingSubmission && (
        <ReviewDialog
          submission={reviewingSubmission}
          onClose={() => setReviewingSubmission(null)}
          onReview={async (status, comment) => {
            await new Promise<void>((resolve, reject) => {
              reviewMutation.mutate(
                { id: reviewingSubmission.id, data: { status: status as FileSubmissionReviewInputStatus, reviewComment: comment } },
                {
                  onSuccess: () => { resolve(); refetch(); toast({ title: `Submission ${status.replace("_", " ")}` }); setReviewingSubmission(null); },
                  onError: reject,
                }
              );
            });
          }}
          isPending={reviewMutation.isPending}
        />
      )}

      {/* View Dialog */}
      {viewingSubmission && (
        <ViewDialog submission={viewingSubmission} onClose={() => setViewingSubmission(null)} />
      )}
    </div>
  );
}

function SubmitDialog({ open, submission, courses, onClose, onSubmit, isPending }: {
  open: boolean;
  submission: FileSubmission | null;
  courses: any[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isPending: boolean;
}) {
  const [courseId, setCourseId] = useState(submission?.courseId?.toString() ?? "");
  const [title, setTitle] = useState(submission?.title ?? "");
  const [description, setDescription] = useState(submission?.description ?? "");
  const [fileUrl, setFileUrl] = useState(submission?.fileUrl ?? "");
  const [fileName, setFileName] = useState(submission?.fileName ?? "");
  const [fileType, setFileType] = useState(submission?.fileType ?? "");

  React.useEffect(() => {
    if (submission) {
      setCourseId(submission.courseId?.toString() ?? "");
      setTitle(submission.title ?? "");
      setDescription(submission.description ?? "");
      setFileUrl(submission.fileUrl ?? "");
      setFileName(submission.fileName ?? "");
      setFileType(submission.fileType ?? "");
    } else {
      setCourseId(""); setTitle(""); setDescription(""); setFileUrl(""); setFileName(""); setFileType("");
    }
  }, [submission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !title || !fileUrl || !fileName) return;
    await onSubmit({ courseId: parseInt(courseId, 10), title, description, fileUrl, fileName, fileType });
  };

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{submission ? "Edit Submission" : "New Submission"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Course *</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.code} — {c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Submission Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Week 3 OJT Report" required />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Briefly describe what you're submitting…" rows={3} />
          </div>
          <div className="space-y-1">
            <Label>File URL *</Label>
            <div className="flex gap-2 items-center">
              <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://drive.google.com/file/…" required />
            </div>
            <p className="text-xs text-muted-foreground">Paste a shareable link (Google Drive, OneDrive, Dropbox, etc.)</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>File Name *</Label>
              <Input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="report.pdf" required />
            </div>
            <div className="space-y-1">
              <Label>File Type</Label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {["PDF", "DOCX", "XLSX", "PPTX", "ZIP", "Image", "Other"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending || !courseId || !title || !fileUrl || !fileName}>
              {isPending ? "Submitting…" : submission ? "Update Submission" : "Submit File"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({ submission, onClose, onReview, isPending }: {
  submission: FileSubmission;
  onClose: () => void;
  onReview: (status: string, comment: string) => Promise<void>;
  isPending: boolean;
}) {
  const [status, setStatus] = useState<string>(submission.status === "pending" ? "" : submission.status);
  const [comment, setComment] = useState(submission.reviewComment ?? "");

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-4 bg-muted rounded-lg space-y-1">
            <p className="font-semibold">{submission.title}</p>
            {submission.studentName && <p className="text-sm text-muted-foreground">By {submission.studentName}</p>}
            {submission.description && <p className="text-sm text-muted-foreground mt-1">{submission.description}</p>}
            <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2">
              <FileText className="h-3.5 w-3.5" /> {submission.fileName}
            </a>
          </div>
          <div className="space-y-1">
            <Label>Decision *</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "approved", label: "Approve", icon: <CheckCircle className="h-4 w-4" />, className: "border-green-500 text-green-700 bg-green-50" },
                { value: "rejected", label: "Reject", icon: <XCircle className="h-4 w-4" />, className: "border-red-500 text-red-700 bg-red-50" },
                { value: "revision_requested", label: "Needs Revision", icon: <RefreshCw className="h-4 w-4" />, className: "border-orange-500 text-orange-700 bg-orange-50" },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    status === opt.value ? opt.className : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Comment {status === "revision_requested" && <span className="text-destructive">*</span>}</Label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Provide feedback to the student…"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!status || isPending || (status === "revision_requested" && !comment.trim())}
            onClick={() => onReview(status, comment)}
          >
            {isPending ? "Saving…" : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewDialog({ submission, onClose }: { submission: FileSubmission; onClose: () => void }) {
  const cfg = statusConfig[submission.status];
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submission Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{submission.title}</h3>
            <Badge variant={cfg.variant} className="gap-1">{cfg.icon}{cfg.label}</Badge>
          </div>
          {submission.studentName && (
            <div className="text-sm"><span className="font-medium">Student:</span> {submission.studentName} {submission.studentEmail && `(${submission.studentEmail})`}</div>
          )}
          {submission.courseTitle && (
            <div className="text-sm"><span className="font-medium">Course:</span> {submission.courseCode} — {submission.courseTitle}</div>
          )}
          {submission.description && (
            <div className="text-sm"><span className="font-medium">Description:</span><p className="mt-1 text-muted-foreground">{submission.description}</p></div>
          )}
          <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{submission.fileName}</p>
              {submission.fileType && <p className="text-xs text-muted-foreground">{submission.fileType}</p>}
            </div>
            <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">Open File</Button>
            </a>
          </div>
          {submission.reviewComment && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Reviewer Feedback {submission.reviewerName && `· ${submission.reviewerName}`}
              </p>
              {submission.reviewComment}
            </div>
          )}
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Submitted: {format(new Date(submission.submittedAt), "MMMM d, yyyy 'at' h:mm a")}</p>
            {submission.reviewedAt && <p>Reviewed: {format(new Date(submission.reviewedAt), "MMMM d, yyyy 'at' h:mm a")}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
