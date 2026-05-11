import React, { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetQuiz, useListQuestions, useStartQuiz, useSubmitAttempt,
  useForceSubmitAttempt, useAttemptHeartbeat, useCreateAlert
} from "@workspace/api-client-react";
import { useAuth } from "../context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Clock, Lock, Camera, Mic, AlertTriangle, CheckCircle } from "lucide-react";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function QuizTake() {
  const [, params] = useRoute("/quiz/:quizId");
  const quizId = params?.quizId ? parseInt(params.quizId) : 0;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [phase, setPhase] = useState<"start" | "taking" | "submitted">("start");
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showViolationOverlay, setShowViolationOverlay] = useState(false);
  const [violationCountdown, setViolationCountdown] = useState(7);
  const violationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: quiz, isLoading: quizLoading } = useGetQuiz(quizId, { query: { enabled: !!quizId } as any });
  const { data: questions, isLoading: questionsLoading } = useListQuestions(quizId, { query: { enabled: !!quizId && phase === "taking" } as any });

  const startQuiz = useStartQuiz();
  const submitAttempt = useSubmitAttempt();
  const forceSubmit = useForceSubmitAttempt();
  const heartbeat = useAttemptHeartbeat();
  const createAlert = useCreateAlert();

  // Timer
  useEffect(() => {
    if (phase !== "taking" || !quiz?.durationMinutes) return;
    if (timeLeft === null) {
      setTimeLeft(quiz.durationMinutes * 60);
      return;
    }
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setTimeout(() => setTimeLeft(tl => (tl ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, quiz?.durationMinutes]);

  // Heartbeat
  useEffect(() => {
    if (phase !== "taking" || !attemptId) return;
    heartbeatRef.current = setInterval(() => {
      heartbeat.mutate({ attemptId, data: { noiseDetected: false, movementDetected: false } } as any);
    }, 30000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [phase, attemptId]);

  // Lockdown: visibility change
  useEffect(() => {
    if (phase !== "taking" || !quiz?.isLockdown) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowViolationOverlay(true);
        setViolationCountdown(7);
        let count = 7;
        violationTimerRef.current = setInterval(() => {
          count--;
          setViolationCountdown(count);
          if (count <= 0) {
            clearInterval(violationTimerRef.current!);
            handleForceSubmit();
          }
        }, 1000);
      } else {
        if (violationTimerRef.current) {
          clearInterval(violationTimerRef.current);
          violationTimerRef.current = null;
        }
        setShowViolationOverlay(false);
        setViolationCountdown(7);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [phase, quiz?.isLockdown, attemptId]);

  // Camera
  useEffect(() => {
    if (phase !== "taking" || !quiz?.lockdownCamera) return;
    navigator.mediaDevices?.getUserMedia({ video: true })
      .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch(() => {});
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [phase, quiz?.lockdownCamera]);

  function handleStart() {
    if (!user) return;
    startQuiz.mutate({ quizId, data: { studentId: user.id } } as any, {
      onSuccess: (attempt: any) => {
        setAttemptId(attempt.id);
        setPhase("taking");
        if (quiz?.isLockdown) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        }
      }
    });
  }

  function handleSubmit() {
    if (!attemptId) return;
    submitAttempt.mutate({ attemptId, data: { answers: JSON.stringify(answers) } } as any, {
      onSuccess: () => { setPhase("submitted"); }
    });
  }

  function handleForceSubmit() {
    if (!attemptId) return;
    forceSubmit.mutate({ attemptId, data: { reason: "tab_switch" } } as any);
    createAlert.mutate({ data: { attemptId, alertType: "tab_switch", message: "Exam auto-submitted: student left the exam window" } } as any);
    setPhase("submitted");
    setShowViolationOverlay(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  if (quizLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!quiz) {
    return <div className="text-center py-20 text-muted-foreground">Quiz not found.</div>;
  }

  // Start screen
  if (phase === "start") {
    return (
      <div data-testid="quiz-take-page" className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant={quiz.quizType === "exam" ? "destructive" : "secondary"}>
                {quiz.quizType === "exam" ? "Exam" : "Quiz"}
              </Badge>
              {quiz.isLockdown && <Badge variant="outline" className="text-amber-600 border-amber-300"><Lock className="h-3 w-3 mr-1" />Lockdown</Badge>}
              {quiz.lockdownCamera && <Badge variant="outline" className="text-blue-600 border-blue-300"><Camera className="h-3 w-3 mr-1" />Camera</Badge>}
              {quiz.lockdownMic && <Badge variant="outline" className="text-purple-600 border-purple-300"><Mic className="h-3 w-3 mr-1" />Microphone</Badge>}
            </div>
            <CardTitle className="text-xl">{quiz.title}</CardTitle>
            {quiz.description && <p className="text-muted-foreground text-sm mt-1">{quiz.description}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              {quiz.durationMinutes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-semibold">{quiz.durationMinutes} min</p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-semibold">{quiz.questionCount ?? "?"}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-semibold">{quiz.totalPoints ?? "?"}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
            </div>

            {quiz.isLockdown && (
              <div className="border border-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800 dark:text-amber-400">Lockdown Exam</p>
                    <ul className="mt-1 space-y-1 text-amber-700 dark:text-amber-300">
                      <li>Your exam will enter fullscreen mode</li>
                      <li>Switching tabs or minimizing will trigger a 7-second auto-submit warning</li>
                      {quiz.lockdownCamera && <li>Your camera will be activated for proctoring</li>}
                      {quiz.lockdownMic && <li>Your microphone will be monitored</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <Button className="w-full" size="lg" onClick={handleStart} disabled={startQuiz.isPending} data-testid="begin-exam-btn">
              {startQuiz.isPending ? "Starting..." : "Begin Exam"}
            </Button>
            {startQuiz.isError && <p className="text-sm text-destructive text-center">Failed to start. Please try again.</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Submitted screen
  if (phase === "submitted") {
    return (
      <div data-testid="quiz-take-page" className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Exam Submitted</h2>
            <p className="text-muted-foreground">Your exam has been successfully submitted.</p>
            <Button onClick={() => navigate(`/quiz/${quizId}/results`)} data-testid="view-results-btn">
              View Results
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Taking screen
  const answeredCount = Object.keys(answers).length;
  const totalQ = questions?.length ?? 0;
  const progress = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;

  return (
    <div data-testid="quiz-take-page" className="space-y-4 relative">
      {/* Violation overlay */}
      {showViolationOverlay && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-card rounded-xl p-8 max-w-md text-center shadow-2xl border-4 border-red-500">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">Exam Integrity Alert</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You have left the exam window. Return immediately or your exam will be auto-submitted.
            </p>
            <div className="text-6xl font-bold text-red-600 mb-4">{violationCountdown}</div>
            <p className="text-sm text-muted-foreground">Seconds remaining to return</p>
          </div>
        </div>
      )}

      {/* Camera preview */}
      {quiz.lockdownCamera && (
        <div className="fixed bottom-4 right-4 z-40">
          <video ref={videoRef} autoPlay muted className="w-32 h-24 rounded-lg border-2 border-primary shadow-lg object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 -mx-6 -mt-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="font-bold">{quiz.title}</h1>
          <p className="text-xs text-muted-foreground">{answeredCount} of {totalQ} answered</p>
        </div>
        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <div className={`flex items-center gap-1 font-mono font-bold text-lg ${timeLeft < 300 ? "text-red-600 animate-pulse" : "text-foreground"}`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          )}
          <Button onClick={handleSubmit} disabled={submitAttempt.isPending} data-testid="submit-exam-btn">
            {submitAttempt.isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>

      <Progress value={progress} className="h-1.5" />

      {/* Questions */}
      {questionsLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full" />)}</div>
      ) : (
        <div className="space-y-4 pb-16">
          {questions?.map((q: any, index: number) => {
            const qid = String(q.id);
            const opts: string[] = (() => { try { return JSON.parse(q.options || "[]"); } catch { return []; } })();

            return (
              <Card key={q.id} className={`transition-colors ${answers[qid] ? "border-primary/40" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                      <p className="font-medium text-sm leading-relaxed">{q.questionText}</p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0 text-xs">{q.points} pts</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {q.questionType === "multiple_choice" && (
                    <div className="space-y-2">
                      {opts.map((opt: string, i: number) => (
                        <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${answers[qid] === opt ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                          <input type="radio" name={`q-${q.id}`} value={opt} checked={answers[qid] === opt}
                            onChange={() => setAnswers(a => ({ ...a, [qid]: opt }))} className="accent-primary" />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.questionType === "true_false" && (
                    <div className="flex gap-4">
                      {["True", "False"].map(v => (
                        <label key={v} className={`flex items-center gap-2 px-6 py-3 rounded-lg border cursor-pointer transition-colors ${answers[qid] === v ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                          <input type="radio" name={`q-${q.id}`} value={v} checked={answers[qid] === v}
                            onChange={() => setAnswers(a => ({ ...a, [qid]: v }))} className="accent-primary" />
                          <span className="text-sm font-medium">{v}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {(q.questionType === "short_answer" || q.questionType === "essay") && (
                    <Textarea
                      value={answers[qid] ?? ""}
                      onChange={e => setAnswers(a => ({ ...a, [qid]: e.target.value }))}
                      placeholder={q.questionType === "essay" ? "Write your essay response here..." : "Enter your answer..."}
                      rows={q.questionType === "essay" ? 6 : 3}
                    />
                  )}

                  {q.questionType === "file_upload" && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Describe what you would submit as a file:</p>
                      <Textarea
                        value={answers[qid] ?? ""}
                        onChange={e => setAnswers(a => ({ ...a, [qid]: e.target.value }))}
                        placeholder="Describe your answer or file content..."
                        rows={3}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
