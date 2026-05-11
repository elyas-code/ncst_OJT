import React, { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetCourse, useListModules, useListFiles, useListQuizzes,
  useListAnnouncements, useCreateAnnouncement, useDeleteAnnouncement,
  useCreateModule, useCreateFile, useDeleteFile, useDeleteQuiz
} from "@workspace/api-client-react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText, ChevronDown, ChevronRight, Plus, Lock, Camera, Mic,
  Clock, BookOpen, ExternalLink, Trash2, BarChart2, Monitor, File,
  MessageSquare,
} from "lucide-react";
import { useAssignments, useCreateAssignment, useDeleteAssignment, useDiscussions } from "../lib/api-extra";

function FileIcon({ fileType }: { fileType: string }) {
  const t = fileType?.toLowerCase();
  if (t === "pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (t === "docx" || t === "doc") return <FileText className="h-4 w-4 text-blue-500" />;
  if (t === "pptx" || t === "ppt") return <FileText className="h-4 w-4 text-orange-500" />;
  if (t === "xlsx" || t === "xls") return <FileText className="h-4 w-4 text-green-500" />;
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(t)) return <File className="h-4 w-4 text-purple-500" />;
  return <File className="h-4 w-4 text-gray-500" />;
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AddAnnouncementDialog({ courseId }: { courseId: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [att, setAtt] = useState<{ url: string; name: string; type: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const createAnn = useCreateAnnouncement();
  const qc = useQueryClient();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setError(`File too large (${(f.size/1024/1024).toFixed(1)} MB). Max 8 MB.`); return; }
    setError(null);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "other";
    const r = new FileReader();
    r.onload = () => setAtt({ url: typeof r.result === "string" ? r.result : "", name: f.name, type: ext, size: f.size });
    r.readAsDataURL(f);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    createAnn.mutate({ courseId, data: {
      courseId, title, content, authorId: user!.id,
      attachmentUrl: att?.url ?? null, attachmentName: att?.name ?? null,
      attachmentType: att?.type ?? null, attachmentSize: att?.size ?? null,
    } } as any, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [`/api/courses/${courseId}/announcements`] });
        setOpen(false); setTitle(""); setContent(""); setAtt(null); setError(null);
      },
      onError: (err: any) => setError(err?.message ?? "Failed to post."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="add-announcement-btn"><Plus className="h-4 w-4 mr-1" />Post Announcement</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" /></div>
          <div className="space-y-2"><Label>Content</Label><Textarea required value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Write your announcement..." /></div>
          <div className="space-y-2">
            <Label>Attach a file (optional, max 8 MB)</Label>
            <Input type="file" onChange={onFile} />
            {att && <p className="text-xs text-muted-foreground">Attached: {att.name} &bull; {formatBytes(att.size)}</p>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button type="submit" disabled={createAnn.isPending}>{createAnn.isPending ? "Posting..." : "Post"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddModuleDialog({ courseId }: { courseId: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createModule = useCreateModule();
  const qc = useQueryClient();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    createModule.mutate({ courseId, data: { courseId, title, description } } as any, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [`/api/courses/${courseId}/modules`] });
        setOpen(false); setTitle(""); setDescription("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="add-module-btn"><Plus className="h-4 w-4 mr-1" />Add Module</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Module</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Week 1: Introduction" /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
          <DialogFooter><Button type="submit" disabled={createModule.isPending}>{createModule.isPending ? "Creating..." : "Create Module"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddFileDialog({ moduleId }: { moduleId: number }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [originalName, setOriginalName] = useState("");
  const [fileType, setFileType] = useState("pdf");
  const [url, setUrl] = useState("");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const createFile = useCreateFile();
  const qc = useQueryClient();

  const MAX_BYTES = 8 * 1024 * 1024;

  function reset() {
    setOriginalName(""); setFileType("pdf"); setUrl(""); setFileSize(null); setError(null); setMode("upload");
  }

  function pickType(name: string) {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const known = ["pdf","docx","doc","pptx","ppt","xlsx","xls","png","jpg","jpeg","gif","webp","mp4","mp3","txt"];
    return known.includes(ext) ? (ext === "jpeg" ? "jpg" : ext) : "other";
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    if (f.size > MAX_BYTES) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max is 8 MB.`);
      return;
    }
    setOriginalName(f.name);
    setFileType(pickType(f.name));
    setFileSize(f.size);
    const reader = new FileReader();
    reader.onload = () => setUrl(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => setError("Could not read file.");
    reader.readAsDataURL(f);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) { setError("Please choose a file or paste a link."); return; }
    if (!originalName) { setError("Please provide a display name."); return; }
    const fileName = originalName.replace(/[^a-z0-9._-]/gi, "_").toLowerCase();
    createFile.mutate(
      { data: { moduleId, fileName, originalName, fileType, fileSize: fileSize ?? undefined, url, uploadedBy: user!.id } } as any,
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: [`/api/modules/${moduleId}/files`] });
          setOpen(false); reset();
        },
        onError: (err: any) => setError(err?.message ?? "Failed to upload file."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => e.stopPropagation()}>
          <Plus className="h-3 w-3 mr-1" />Add File
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2 border border-border rounded-md p-1 bg-muted/30">
            <button type="button" onClick={() => setMode("upload")}
              className={`flex-1 text-sm py-1.5 rounded ${mode === "upload" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
              Upload from device
            </button>
            <button type="button" onClick={() => setMode("link")}
              className={`flex-1 text-sm py-1.5 rounded ${mode === "link" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
              External link
            </button>
          </div>

          {mode === "upload" ? (
            <div className="space-y-2">
              <Label>Choose a file (max 8 MB)</Label>
              <Input type="file" onChange={onFileChosen}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mp3,.txt" />
              {fileSize !== null && (
                <p className="text-xs text-muted-foreground">Selected: {originalName} &bull; {formatBytes(fileSize)}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input required={mode === "link"} value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://drive.google.com/..." />
            </div>
          )}

          <div className="space-y-2">
            <Label>Display name shown to students</Label>
            <Input required value={originalName} onChange={e => setOriginalName(e.target.value)}
              placeholder="Lecture 1 - Introduction" />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              value={fileType} onChange={e => setFileType(e.target.value)}>
              {["pdf","docx","doc","pptx","ppt","xlsx","xls","png","jpg","gif","webp","mp4","mp3","txt","other"].map(t =>
                <option key={t} value={t}>{t.toUpperCase()}</option>
              )}
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={createFile.isPending || !url}>
              {createFile.isPending ? "Adding..." : "Add to Module"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ModuleRow({ module, canEdit }: { module: any; canEdit: boolean }) {
  const [open, setOpen] = useState(true);
  const { data: files, isLoading } = useListFiles(module.id, { query: { enabled: true } as any });
  const deleteFile = useDeleteFile();
  const qc = useQueryClient();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-4 py-3 bg-card cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-3">
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <div>
                <p className="font-semibold text-sm">{module.title}</p>
                {module.description && <p className="text-xs text-muted-foreground">{module.description}</p>}
              </div>
            </div>
            {canEdit && <AddFileDialog moduleId={module.id} />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="divide-y divide-border bg-muted/20">
            {isLoading && <div className="px-4 py-3 text-sm text-muted-foreground">Loading files...</div>}
            {files?.length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground italic">No files in this module.</div>}
            {files?.map((file: any) => (
              <div key={file.id} className="flex items-center justify-between px-4 py-2.5 group">
                <div className="flex items-center gap-3">
                  <FileIcon fileType={file.fileType} />
                  <div>
                    <p className="text-sm font-medium">{file.originalName}</p>
                    <p className="text-xs text-muted-foreground">{file.fileType?.toUpperCase()} {formatBytes(file.fileSize)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="h-7 text-xs"><ExternalLink className="h-3 w-3 mr-1" />Open</Button>
                  </a>
                  {canEdit && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100"
                      onClick={() => deleteFile.mutate({ id: file.id } as any, { onSuccess: () => qc.invalidateQueries() })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function CourseDetail() {
  const [, params] = useRoute("/courses/:id");
  const courseId = params?.id ? parseInt(params.id) : 0;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const { data: course, isLoading: courseLoading } = useGetCourse(courseId, { query: { enabled: !!courseId } as any });
  const { data: modules, isLoading: modulesLoading } = useListModules(courseId, { query: { enabled: !!courseId } as any });
  const { data: quizzes, isLoading: quizzesLoading } = useListQuizzes(courseId, { query: { enabled: !!courseId } as any });
  const { data: announcements, isLoading: annsLoading } = useListAnnouncements(courseId, { query: { enabled: !!courseId } as any });
  const deleteAnn = useDeleteAnnouncement();
  const deleteQuiz = useDeleteQuiz();
  const qc = useQueryClient();

  if (courseLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!course) {
    return <div className="text-center py-20 text-muted-foreground">Course not found.</div>;
  }

  return (
    <div data-testid="course-detail-page" className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/courses" className="hover:text-foreground">Courses</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{course.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
            <Badge variant={course.isActive ? "default" : "secondary"}>{course.isActive ? "Active" : "Inactive"}</Badge>
          </div>
          <p className="text-muted-foreground">{course.code} &bull; {course.teacherName} &bull; {course.semester} {course.academicYear}</p>
          {course.description && <p className="text-sm mt-2 text-muted-foreground max-w-2xl">{course.description}</p>}
        </div>
        {isTeacher && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/courses/${courseId}/grades`)}>
              <BarChart2 className="h-4 w-4 mr-1" />Grades
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/courses/${courseId}/proctor`)}>
              <Monitor className="h-4 w-4 mr-1" />Proctor
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes & Exams</TabsTrigger>
          <TabsTrigger value="discussions">Discussions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Announcements</h2>
            {isTeacher && <AddAnnouncementDialog courseId={courseId} />}
          </div>
          {annsLoading && [1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          {announcements?.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No announcements yet.</CardContent></Card>
          )}
          {announcements?.map((ann: any) => (
            <Card key={ann.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{ann.title}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {ann.authorName} &bull; {new Date(ann.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </CardDescription>
                  </div>
                  {isTeacher && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                      onClick={() => deleteAnn.mutate({ id: ann.id } as any, { onSuccess: () => qc.invalidateQueries() })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{ann.content}</p>
                {ann.attachmentUrl && (
                  <a href={ann.attachmentUrl} download={ann.attachmentName} target="_blank" rel="noopener noreferrer" className="inline-block">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <FileText className="h-3 w-3 mr-1" />{ann.attachmentName} <ExternalLink className="h-3 w-3 ml-1.5" />
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Course Materials</h2>
            {isTeacher && <AddModuleDialog courseId={courseId} />}
          </div>
          {modulesLoading && [1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          {modules?.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No modules yet. {isTeacher && "Add a module to get started."}</CardContent></Card>
          )}
          <div className="space-y-3">
            {modules?.map((module: any) => (
              <ModuleRow key={module.id} module={module} canEdit={isTeacher} />
            ))}
          </div>
        </TabsContent>

        {/* Quizzes Tab */}
        <TabsContent value="quizzes" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Quizzes &amp; Exams</h2>
            {isTeacher && (
              <Button size="sm" onClick={() => navigate(`/courses/${courseId}/quiz-builder`)} data-testid="create-quiz-btn">
                <Plus className="h-4 w-4 mr-1" />Build Quiz
              </Button>
            )}
          </div>
          {quizzesLoading && [1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          {quizzes?.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No quizzes published yet.</CardContent></Card>
          )}
          <div className="space-y-3">
            {quizzes?.map((quiz: any) => (
              <Card key={quiz.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{quiz.title}</span>
                          <Badge variant={quiz.quizType === "exam" ? "destructive" : "secondary"} className="text-xs">
                            {quiz.quizType === "exam" ? "Exam" : "Quiz"}
                          </Badge>
                          {!quiz.isPublished && <Badge variant="outline" className="text-xs">Draft</Badge>}
                          {quiz.isLockdown && <span title="Lockdown"><Lock className="h-3 w-3 text-amber-600" /></span>}
                          {quiz.lockdownCamera && <span title="Camera"><Camera className="h-3 w-3 text-amber-600" /></span>}
                          {quiz.lockdownMic && <span title="Microphone"><Mic className="h-3 w-3 text-amber-600" /></span>}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {quiz.durationMinutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{quiz.durationMinutes} min</span>}
                          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{quiz.questionCount ?? 0} questions</span>
                          <span>{quiz.totalPoints ?? 0} pts</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isTeacher && quiz.isPublished && (
                        <Button size="sm" onClick={() => navigate(`/quiz/${quiz.id}`)} data-testid={`start-quiz-${quiz.id}`}>
                          Start
                        </Button>
                      )}
                      {!isTeacher && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/quiz/${quiz.id}/results`)}>Results</Button>
                      )}
                      {isTeacher && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/quiz/${quiz.id}/results`)}>Submissions</Button>
                          <Button size="sm" variant="ghost" className="text-destructive"
                            onClick={() => deleteQuiz.mutate({ id: quiz.id } as any, { onSuccess: () => qc.invalidateQueries() })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <CourseAssignments courseId={courseId} canManage={isTeacher} />
        </TabsContent>

        <TabsContent value="discussions" className="mt-4">
          <CourseDiscussionsTab courseId={courseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CourseAssignments({ courseId, canManage }: { courseId: number; canManage: boolean }) {
  const { data, isLoading } = useAssignments(courseId);
  const createMut = useCreateAssignment(courseId);
  const delMut = useDeleteAssignment(courseId);
  const [, navigate] = useLocation();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [points, setPoints] = React.useState(100);
  const [dueAt, setDueAt] = React.useState("");
  const [att, setAtt] = React.useState<{ url: string; name: string; type: string; size: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setError(`File too large (${(f.size/1024/1024).toFixed(1)} MB). Max 8 MB.`); return; }
    setError(null);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "other";
    const r = new FileReader();
    r.onload = () => setAtt({ url: typeof r.result === "string" ? r.result : "", name: f.name, type: ext, size: f.size });
    r.readAsDataURL(f);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    createMut.mutate({
      title, description, instructions, points,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      attachmentUrl: att?.url ?? null, attachmentName: att?.name ?? null,
      attachmentType: att?.type ?? null, attachmentSize: att?.size ?? null,
    }, {
      onSuccess: () => { setOpen(false); setTitle(""); setDescription(""); setInstructions(""); setPoints(100); setDueAt(""); setAtt(null); setError(null); },
      onError: (err: any) => setError(err?.message ?? "Failed to create."),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Assignments</h2>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New Assignment</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create assignment</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                <div className="space-y-1.5"><Label>Title</Label><Input required value={title} onChange={e => setTitle(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Short description</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Instructions</Label><Textarea rows={4} value={instructions} onChange={e => setInstructions(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Points</Label><Input type="number" min={0} value={points} onChange={e => setPoints(parseInt(e.target.value) || 0)} /></div>
                  <div className="space-y-1.5"><Label>Due date</Label><Input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Reference file (optional, max 8 MB) — brief, starter file, rubric, etc.</Label>
                  <Input type="file" onChange={onFile} />
                  {att && <p className="text-xs text-muted-foreground">Attached: {att.name} &bull; {formatBytes(att.size)}</p>}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <DialogFooter><Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "Creating..." : "Create"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {isLoading && [1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      {!isLoading && !data?.length && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No assignments yet.</CardContent></Card>
      )}
      <div className="space-y-2">
        {data?.map((a: any) => (
          <Card key={a.id} className="hover:border-primary/30 cursor-pointer transition-colors" onClick={() => navigate(`/assignments/${a.id}`)}>
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{a.title}</span>
                  {!a.isPublished && <Badge variant="outline" className="text-xs">Draft</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {a.dueAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {new Date(a.dueAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                  <span>{a.points} pts</span>
                  {a.submissionCount != null && <span>&bull; {a.submissionCount} submission{a.submissionCount === 1 ? "" : "s"}</span>}
                </div>
              </div>
              {canManage && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm("Delete assignment?")) delMut.mutate(a.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CourseDiscussionsTab({ courseId }: { courseId: number }) {
  const { data, isLoading } = useDiscussions(courseId);
  const [, navigate] = useLocation();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Discussions</h2>
        <Button size="sm" variant="outline" onClick={() => navigate(`/courses/${courseId}/discussions`)}>
          Open full forum →
        </Button>
      </div>
      {isLoading && [1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      {!isLoading && !data?.length && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No discussion threads yet.</CardContent></Card>
      )}
      <div className="space-y-2">
        {data?.slice(0, 6).map((d: any) => (
          <Card key={d.id} className="hover:border-primary/30 cursor-pointer transition-colors" onClick={() => navigate(`/courses/${courseId}/discussions/${d.id}`)}>
            <CardContent className="py-3 flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{d.title}</p>
                <p className="text-xs text-muted-foreground">{d.authorName} &bull; {d.replyCount} repl{d.replyCount === 1 ? "y" : "ies"}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
