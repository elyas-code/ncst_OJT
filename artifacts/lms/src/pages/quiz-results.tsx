import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetQuiz, useListQuizAttempts, useListQuestions, useGradeAttempt } from "@workspace/api-client-react";
import { useAuth } from "../context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  graded: { label: "Graded", variant: "default" },
  submitted: { label: "Submitted", variant: "secondary" },
  force_submitted: { label: "Force Submitted", variant: "destructive" },
  in_progress: { label: "In Progress", variant: "outline" },
};

function ScoreBadge({ score, max }: { score?: number | null; max?: number | null }) {
  if (score == null || max == null) return <span className="text-muted-foreground">-</span>;
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const color = pct >= 80 ? "text-green-600" : pct >= 60 ? "text-yellow-600" : "text-red-600";
  return <span className={`font-semibold ${color}`}>{score}/{max} ({pct}%)</span>;
}

function GradeAttemptPanel({ attempt, questions }: { attempt: any; questions: any[] }) {
  const [gradeScore, setGradeScore] = useState<string>(attempt.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(attempt.feedback ?? "");
  const gradeAttempt = useGradeAttempt();
  const qc = useQueryClient();

  const parsedAnswers: Record<string, string> = (() => {
    try { return JSON.parse(attempt.answers || "{}"); } catch { return {}; }
  })();

  const manualQuestions = questions.filter(q => q.questionType === "essay" || q.questionType === "short_answer" || q.questionType === "file_upload");

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      {questions.map((q: any, i: number) => {
        const studentAnswer = parsedAnswers[String(q.id)];
        const isCorrect = (q.questionType === "multiple_choice" || q.questionType === "true_false")
          && q.correctAnswer && studentAnswer?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        const needsManual = q.questionType === "essay" || q.questionType === "short_answer" || q.questionType === "file_upload";

        return (
          <div key={q.id} className={`p-3 rounded-lg border ${isCorrect ? "border-green-200 bg-green-50/50 dark:bg-green-900/10" : needsManual ? "border-blue-200 bg-blue-50/50 dark:bg-blue-900/10" : "border-red-200 bg-red-50/50 dark:bg-red-900/10"}`}>
            <div className="flex items-start gap-2">
              {!needsManual && (isCorrect
                ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                : <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              )}
              {needsManual && <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />}
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{i + 1}. {q.questionText}</p>
                {studentAnswer && <p className="text-xs text-muted-foreground">Answer: <span className="text-foreground">{studentAnswer}</span></p>}
                {!studentAnswer && <p className="text-xs text-muted-foreground italic">No answer provided</p>}
                {q.correctAnswer && !needsManual && <p className="text-xs text-muted-foreground">Correct: <span className="text-green-600 font-medium">{q.correctAnswer}</span></p>}
                {q.explanation && <p className="text-xs text-muted-foreground italic">{q.explanation}</p>}
              </div>
              <Badge variant="outline" className="text-xs flex-shrink-0">{q.points} pts</Badge>
            </div>
          </div>
        );
      })}

      {manualQuestions.length > 0 && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold">Manual Grading</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Score (max: {attempt.maxScore})</Label>
              <Input type="number" min="0" max={attempt.maxScore} value={gradeScore} onChange={e => setGradeScore(e.target.value)} className="h-8" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Feedback</Label>
            <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2} placeholder="Optional feedback for the student..." />
          </div>
          <Button size="sm" disabled={gradeAttempt.isPending}
            onClick={() => gradeAttempt.mutate({ attemptId: attempt.id, data: { score: parseFloat(gradeScore), feedback } } as any, {
              onSuccess: () => qc.invalidateQueries()
            })}>
            {gradeAttempt.isPending ? "Saving..." : "Save Grade"}
          </Button>
          {gradeAttempt.isSuccess && <p className="text-xs text-green-600">Grade saved.</p>}
        </div>
      )}
    </div>
  );
}

export default function QuizResults() {
  const [, params] = useRoute("/quiz/:quizId/results");
  const quizId = params?.quizId ? parseInt(params.quizId) : 0;
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const [expandedAttempt, setExpandedAttempt] = useState<number | null>(null);

  const { data: quiz, isLoading: quizLoading } = useGetQuiz(quizId, { query: { enabled: !!quizId } as any });
  const { data: attempts, isLoading: attemptsLoading } = useListQuizAttempts(quizId, { query: { enabled: !!quizId } as any });
  const { data: questions } = useListQuestions(quizId, { query: { enabled: !!quizId } as any });

  if (quizLoading || attemptsLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-64 w-full" /></div>;
  }

  const myAttempt = attempts?.find((a: any) => a.studentId === user?.id);

  // Student view
  if (!isTeacher) {
    const parsedAnswers: Record<string, string> = (() => {
      try { return JSON.parse(myAttempt?.answers || "{}"); } catch { return {}; }
    })();

    if (!myAttempt) {
      return (
        <div data-testid="quiz-results-page" className="max-w-2xl mx-auto">
          <Card><CardContent className="py-16 text-center text-muted-foreground">You have not attempted this quiz yet.</CardContent></Card>
        </div>
      );
    }

    const maxScore = myAttempt.maxScore ?? 0;
    const pct = maxScore > 0 ? Math.round((myAttempt.score ?? 0) / maxScore * 100) : 0;

    return (
      <div data-testid="quiz-results-page" className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/courses" className="hover:text-foreground">Courses</Link>
          <span>/</span>
          <span className="text-foreground">{quiz?.title} — Results</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{quiz?.title}</CardTitle>
            <CardDescription>Your submission result</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6">
              <div className={`text-5xl font-bold mb-2 ${pct >= 80 ? "text-green-600" : pct >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                {pct}%
              </div>
              <p className="text-xl font-semibold mb-1">{myAttempt.score ?? "?"} / {myAttempt.maxScore ?? "?"} points</p>
              <Badge variant={STATUS_BADGES[myAttempt.status]?.variant}>{STATUS_BADGES[myAttempt.status]?.label ?? myAttempt.status}</Badge>
              {myAttempt.lateEntry && <Badge variant="outline" className="ml-2 text-amber-600">Late Entry</Badge>}
            </div>
            <Progress value={pct} className="h-3" />
            {myAttempt.feedback && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Instructor Feedback</p>
                <p className="text-sm">{myAttempt.feedback}</p>
              </div>
            )}

            {myAttempt.status === "submitted" || myAttempt.status === "force_submitted" ? (
              <p className="text-sm text-center text-muted-foreground">Your submission is being graded. Check back later.</p>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Question Review</h3>
                {questions?.map((q: any, i: number) => {
                  const studentAnswer = parsedAnswers[String(q.id)];
                  const isCorrect = (q.questionType === "multiple_choice" || q.questionType === "true_false")
                    && q.correctAnswer && studentAnswer?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                  const needsManual = q.questionType === "essay" || q.questionType === "short_answer" || q.questionType === "file_upload";

                  return (
                    <div key={q.id} className={`p-3 rounded-lg border text-sm ${isCorrect ? "border-green-200 bg-green-50/50" : needsManual ? "border-muted" : "border-red-200 bg-red-50/50"}`}>
                      <p className="font-medium mb-1">{i + 1}. {q.questionText}</p>
                      {studentAnswer && <p className="text-muted-foreground">Your answer: <span className="text-foreground">{studentAnswer}</span></p>}
                      {!studentAnswer && <p className="text-muted-foreground italic">No answer provided</p>}
                      {q.correctAnswer && !needsManual && <p className="text-muted-foreground">Correct: <span className="text-green-600 font-medium">{q.correctAnswer}</span></p>}
                      {q.explanation && <p className="text-muted-foreground mt-1 italic">{q.explanation}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Teacher view
  return (
    <div data-testid="quiz-results-page" className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/courses" className="hover:text-foreground">Courses</Link>
        <span>/</span>
        <span className="text-foreground">{quiz?.title} — Submissions</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{quiz?.title}</h1>
        <p className="text-muted-foreground text-sm">{attempts?.length ?? 0} submission{attempts?.length !== 1 ? "s" : ""}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Late</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts?.map((attempt: any) => (
                <React.Fragment key={attempt.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedAttempt(expandedAttempt === attempt.id ? null : attempt.id)}
                  >
                    <TableCell className="w-8">
                      {expandedAttempt === attempt.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="font-medium">{attempt.studentName}</TableCell>
                    <TableCell><ScoreBadge score={attempt.score} max={attempt.maxScore} /></TableCell>
                    <TableCell><Badge variant={STATUS_BADGES[attempt.status]?.variant ?? "outline"} className="text-xs">{STATUS_BADGES[attempt.status]?.label ?? attempt.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell>
                      {attempt.lateEntry && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">+{attempt.lateMinutes}m late</Badge>}
                    </TableCell>
                  </TableRow>
                  {expandedAttempt === attempt.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/20 p-4">
                        <GradeAttemptPanel attempt={attempt} questions={questions ?? []} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          {attempts?.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">No submissions yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
