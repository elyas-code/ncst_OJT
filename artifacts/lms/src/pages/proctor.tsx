import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetCourse, useListQuizzes, useListQuizAttempts, useListAlerts, useResolveAlert } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Monitor, Users, Bell, RefreshCw, Clock, AlertTriangle } from "lucide-react";

const ALERT_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  tab_switch: { label: "Tab Switch", color: "text-orange-700", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  noise_detected: { label: "Noise Detected", color: "text-yellow-700", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  movement_detected: { label: "Movement", color: "text-yellow-700", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  force_submitted: { label: "Force Submitted", color: "text-red-700", bgColor: "bg-red-100 dark:bg-red-900/30" },
  late_entry: { label: "Late Entry", color: "text-amber-700", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  violation: { label: "Violation", color: "text-red-700", bgColor: "bg-red-100 dark:bg-red-900/30" },
};

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; badgeColor: string }> = {
  in_progress: { label: "In Progress", dotColor: "bg-green-500 animate-pulse", badgeColor: "text-green-700" },
  submitted: { label: "Submitted", dotColor: "bg-gray-400", badgeColor: "text-gray-600" },
  force_submitted: { label: "Force Submitted", dotColor: "bg-red-500", badgeColor: "text-red-700" },
  graded: { label: "Graded", dotColor: "bg-blue-500", badgeColor: "text-blue-700" },
};

function ResolveDialog({ alert, onResolved }: { alert: any; onResolved: () => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const resolveAlert = useResolveAlert();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-6 text-xs">Resolve</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Resolve Alert</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{alert.message}</p>
          <div className="space-y-1">
            <Label className="text-xs">Resolution Note (optional)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Add a note about how this was resolved..." />
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={() => resolveAlert.mutate({ id: alert.id, data: { resolvedNote: note } } as any, {
            onSuccess: () => { setOpen(false); onResolved(); }
          })} disabled={resolveAlert.isPending}>
            {resolveAlert.isPending ? "Resolving..." : "Mark Resolved"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Proctor() {
  const [, params] = useRoute("/courses/:courseId/proctor");
  const courseId = params?.courseId ? parseInt(params.courseId) : 0;
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: course } = useGetCourse(courseId, { query: { enabled: !!courseId } as any });
  const { data: quizzes } = useListQuizzes(courseId, { query: { enabled: !!courseId } as any });
  const { data: attempts, isLoading: attemptsLoading } = useListQuizAttempts(
    selectedQuizId ?? 0,
    { query: { enabled: !!selectedQuizId, refetchInterval: 10000 } as any }
  );
  const { data: allAlerts, isLoading: alertsLoading } = useListAlerts(
    { query: { refetchInterval: 10000 } as any }
  );

  const attemptIds = new Set(attempts?.map((a: any) => a.id) ?? []);
  const examAlerts = allAlerts?.filter((al: any) => attemptIds.has(al.attemptId)) ?? [];
  const unresolvedAlerts = examAlerts.filter((a: any) => !a.resolved);

  const inProgressStudents = attempts?.filter((a: any) => a.status === "in_progress") ?? [];
  const allStudents = attempts ?? [];

  return (
    <div data-testid="proctor-page" className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/courses" className="hover:text-foreground">Courses</Link>
        <span>/</span>
        <Link href={`/courses/${courseId}`} className="hover:text-foreground">{course?.title}</Link>
        <span>/</span>
        <span className="text-foreground">Proctor</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Monitor className="h-6 w-6" />Exam Proctoring
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Live monitoring &bull; Auto-refreshes every 10 seconds</p>
        </div>
        {unresolvedAlerts.length > 0 && (
          <Badge variant="destructive" className="text-sm">
            <Bell className="h-4 w-4 mr-1" />{unresolvedAlerts.length} alert{unresolvedAlerts.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Exam selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <Label className="whitespace-nowrap text-sm font-medium">Select Exam to Monitor</Label>
            <Select value={selectedQuizId?.toString() ?? ""} onValueChange={v => setSelectedQuizId(parseInt(v))}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Choose an exam..." />
              </SelectTrigger>
              <SelectContent>
                {quizzes?.filter((q: any) => q.isPublished).map((q: any) => (
                  <SelectItem key={q.id} value={String(q.id)}>
                    {q.title} {q.quizType === "exam" ? "(Exam)" : "(Quiz)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()} className="ml-auto">
              <RefreshCw className="h-4 w-4 mr-1" />Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedQuizId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Students */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Live Students</h2>
              {inProgressStudents.length > 0 && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                  {inProgressStudents.length} active
                </Badge>
              )}
            </div>

            {attemptsLoading ? (
              [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)
            ) : allStudents.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">No students have started this exam yet.</CardContent></Card>
            ) : (
              allStudents.map((attempt: any) => {
                const sc = STATUS_CONFIG[attempt.status] ?? STATUS_CONFIG.in_progress;
                const studentAlerts = examAlerts.filter((a: any) => a.attemptId === attempt.id && !a.resolved);

                return (
                  <Card key={attempt.id} className={attempt.status === "force_submitted" ? "border-red-300" : ""}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dotColor}`} />
                          <div>
                            <p className="font-semibold text-sm">{attempt.studentName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs ${sc.badgeColor}`}>{sc.label}</span>
                              {attempt.lateEntry && <span className="text-xs text-amber-600">Late (+{attempt.lateMinutes}m)</span>}
                              {attempt.startedAt && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />
                                  {new Date(attempt.startedAt).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {studentAlerts.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />{studentAlerts.length}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Right: Alerts */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Alerts</h2>
              {unresolvedAlerts.length > 0 && (
                <Badge variant="destructive" className="text-xs">{unresolvedAlerts.length} unresolved</Badge>
              )}
            </div>

            {alertsLoading ? (
              [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)
            ) : examAlerts.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">No alerts for this exam.</CardContent></Card>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {examAlerts
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((alert: any) => {
                    const cfg = ALERT_CONFIG[alert.alertType] ?? ALERT_CONFIG.violation;
                    return (
                      <div
                        key={alert.id}
                        className={`rounded-lg border p-3 ${alert.resolved ? "opacity-50 bg-muted/30" : cfg.bgColor}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                              <span className="text-xs font-medium">{alert.studentName}</span>
                              {alert.resolved && <Badge variant="outline" className="text-xs h-4">Resolved</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(alert.createdAt).toLocaleTimeString()}
                            </p>
                            {alert.resolvedNote && <p className="text-xs mt-1 italic text-muted-foreground">Note: {alert.resolvedNote}</p>}
                          </div>
                          {!alert.resolved && (
                            <ResolveDialog alert={alert} onResolved={() => qc.invalidateQueries()} />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedQuizId && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Monitor className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Select an exam above to begin monitoring</p>
            <p className="text-sm mt-1">Live student activity and alerts will appear here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
