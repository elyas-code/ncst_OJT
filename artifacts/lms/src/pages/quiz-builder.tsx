import React, { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useCreateQuiz, useCreateQuestion } from "@workspace/api-client-react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";

type QuestionType = "multiple_choice" | "true_false" | "short_answer" | "essay" | "file_upload";

interface QuestionDraft {
  id: string;
  questionText: string;
  questionType: QuestionType;
  points: number;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

function QuestionCard({ q, index, onChange, onDelete }: {
  q: QuestionDraft;
  index: number;
  onChange: (q: QuestionDraft) => void;
  onDelete: () => void;
}) {
  const update = (patch: Partial<QuestionDraft>) => onChange({ ...q, ...patch });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Question {index + 1}</CardTitle>
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Question Text</Label>
            <Textarea
              value={q.questionText}
              onChange={e => update({ questionText: e.target.value })}
              placeholder="Enter your question..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={q.questionType} onValueChange={v => update({ questionType: v as QuestionType, correctAnswer: "", options: ["", "", "", ""] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True / False</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
                <SelectItem value="essay">Essay</SelectItem>
                <SelectItem value="file_upload">File Upload</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Label>Points</Label>
              <Input type="number" min="1" value={q.points} onChange={e => update({ points: parseInt(e.target.value) || 1 })} className="h-8" />
            </div>
          </div>
        </div>

        {q.questionType === "multiple_choice" && (
          <div className="space-y-2">
            <Label>Options <span className="text-xs text-muted-foreground">(select correct answer)</span></Label>
            {q.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctAnswer === opt && opt !== ""}
                  onChange={() => update({ correctAnswer: opt })}
                  className="h-4 w-4 accent-primary"
                />
                <Input
                  value={opt}
                  onChange={e => {
                    const newOpts = [...q.options];
                    newOpts[i] = e.target.value;
                    update({ options: newOpts, correctAnswer: q.correctAnswer === q.options[i] ? e.target.value : q.correctAnswer });
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="h-8"
                />
                {q.options.length > 2 && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                    onClick={() => {
                      const newOpts = q.options.filter((_, idx) => idx !== i);
                      update({ options: newOpts, correctAnswer: q.correctAnswer === q.options[i] ? "" : q.correctAnswer });
                    }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            {q.options.length < 6 && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => update({ options: [...q.options, ""] })}>
                <Plus className="h-3 w-3 mr-1" />Add Option
              </Button>
            )}
          </div>
        )}

        {q.questionType === "true_false" && (
          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <div className="flex gap-4">
              {["True", "False"].map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name={`tf-${q.id}`} checked={q.correctAnswer === v} onChange={() => update({ correctAnswer: v })} className="h-4 w-4 accent-primary" />
                  <span className="text-sm">{v}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {(q.questionType === "short_answer" || q.questionType === "essay") && (
          <div className="px-3 py-2 bg-muted/50 rounded text-xs text-muted-foreground">
            Students will type their response. Manual grading required.
          </div>
        )}

        {q.questionType === "file_upload" && (
          <div className="px-3 py-2 bg-muted/50 rounded text-xs text-muted-foreground">
            Students will describe their file upload in text. Manual grading required.
          </div>
        )}

        <div className="space-y-2">
          <Label>Explanation <span className="text-xs text-muted-foreground">(shown after grading)</span></Label>
          <Input value={q.explanation} onChange={e => update({ explanation: e.target.value })} placeholder="Optional explanation..." className="h-8" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuizBuilder() {
  const [, params] = useRoute("/courses/:courseId/quiz-builder");
  const courseId = params?.courseId ? parseInt(params.courseId) : 0;
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quizType, setQuizType] = useState<"quiz" | "exam">("quiz");
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [isLockdown, setIsLockdown] = useState(false);
  const [lockdownCamera, setLockdownCamera] = useState(false);
  const [lockdownMic, setLockdownMic] = useState(false);

  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  const createQuiz = useCreateQuiz();
  const createQuestion = useCreateQuestion();

  const addQuestion = () => {
    setQuestions(qs => [...qs, {
      id: Math.random().toString(36).slice(2),
      questionText: "",
      questionType: "multiple_choice",
      points: 1,
      options: ["", "", "", ""],
      correctAnswer: "",
      explanation: "",
    }]);
  };

  const saveQuiz = async (publish: boolean) => {
    if (!title.trim()) return;
    const quiz = await new Promise<any>((resolve, reject) => {
      createQuiz.mutate({
        data: {
          courseId,
          title,
          description,
          quizType,
          isLockdown: quizType === "exam" ? isLockdown : false,
          lockdownCamera: isLockdown ? lockdownCamera : false,
          lockdownMic: isLockdown ? lockdownMic : false,
          durationMinutes: durationMinutes || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          maxAttempts,
          isPublished: publish,
        }
      } as any, { onSuccess: resolve, onError: reject }
      );
    });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await new Promise<void>((resolve, reject) => {
        createQuestion.mutate({
          quizId: quiz.id,
          data: {
            quizId: quiz.id,
            questionText: q.questionText,
            questionType: q.questionType,
            points: q.points,
            position: i,
            options: q.questionType === "multiple_choice" ? JSON.stringify(q.options.filter(o => o.trim())) : undefined,
            correctAnswer: q.correctAnswer || undefined,
            explanation: q.explanation || undefined,
          }
        } as any, { onSuccess: () => resolve(), onError: reject });
      });
    }

    navigate(`/courses/${courseId}`);
  };

  return (
    <div data-testid="quiz-builder-page" className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/courses" className="hover:text-foreground">Courses</Link>
        <span>/</span>
        <Link href={`/courses/${courseId}`} className="hover:text-foreground">Course</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Quiz Builder</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Quiz Builder</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveQuiz(false)} disabled={createQuiz.isPending || !title.trim()}>Save Draft</Button>
          <Button onClick={() => saveQuiz(true)} disabled={createQuiz.isPending || !title.trim()}>
            {createQuiz.isPending ? "Saving..." : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Quiz Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title <span className="text-destructive">*</span></Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Midterm Exam" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional instructions..." />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={quizType} onValueChange={v => { setQuizType(v as "quiz" | "exam"); if (v === "quiz") setIsLockdown(false); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input type="number" min="1" value={durationMinutes || ""} onChange={e => setDurationMinutes(parseInt(e.target.value) || undefined)} placeholder="e.g. 60" />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Attempts</Label>
                <Input type="number" min="1" value={maxAttempts} onChange={e => setMaxAttempts(parseInt(e.target.value) || 1)} />
              </div>
              {quizType === "exam" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <Label className="text-sm font-semibold">Lockdown Settings</Label>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">Lockdown Mode</Label>
                    <Switch checked={isLockdown} onCheckedChange={setIsLockdown} />
                  </div>
                  {isLockdown && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">Camera Monitoring</Label>
                        <Switch checked={lockdownCamera} onCheckedChange={setLockdownCamera} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">Microphone Monitoring</Label>
                        <Switch checked={lockdownMic} onCheckedChange={setLockdownMic} />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{questions.length} questions</span>
                  <span>&bull;</span>
                  <span>{questions.reduce((s, q) => s + q.points, 0)} points total</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Questions panel */}
        <div className="lg:col-span-2 space-y-4">
          {questions.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center text-muted-foreground">
                <BookOpenIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No questions yet</p>
                <p className="text-sm mt-1">Click below to add your first question</p>
              </CardContent>
            </Card>
          )}
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={i}
              onChange={updated => setQuestions(qs => qs.map(x => x.id === q.id ? updated : x))}
              onDelete={() => setQuestions(qs => qs.filter(x => x.id !== q.id))}
            />
          ))}
          <Button variant="outline" className="w-full" onClick={addQuestion} data-testid="add-question-btn">
            <Plus className="h-4 w-4 mr-2" />Add Question
          </Button>
        </div>
      </div>
    </div>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
}
