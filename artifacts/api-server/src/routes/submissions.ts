import { Router, type IRouter } from "express";
import { db, attemptsTable, questionsTable, quizzesTable, usersTable, alertsTable } from "@workspace/db";
import { eq, sum } from "drizzle-orm";

const router: IRouter = Router();

const toAttempt = (a: typeof attemptsTable.$inferSelect, extra?: { studentName?: string | null; quizTitle?: string | null }) => ({
  ...a,
  studentName: extra?.studentName ?? null,
  quizTitle: extra?.quizTitle ?? null,
});

router.get("/attempts/:attemptId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId;
  const attemptId = parseInt(raw, 10);
  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, attemptId));
  if (!attempt) { res.status(404).json({ error: "Not found" }); return; }
  const [student] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, attempt.studentId));
  const [quiz] = await db.select({ title: quizzesTable.title }).from(quizzesTable).where(eq(quizzesTable.id, attempt.quizId));
  res.json(toAttempt(attempt, { studentName: student?.name, quizTitle: quiz?.title }));
});

router.post("/attempts/:attemptId/submit", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId;
  const attemptId = parseInt(raw, 10);
  const { answers } = req.body;

  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, attemptId));
  if (!attempt) { res.status(404).json({ error: "Not found" }); return; }

  // Auto-grade where possible
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, attempt.quizId));
  const [maxScoreRow] = await db.select({ total: sum(questionsTable.points) }).from(questionsTable).where(eq(questionsTable.quizId, attempt.quizId));
  const maxScore = Number(maxScoreRow?.total ?? 0);

  let autoScore = 0;
  let parsedAnswers: Record<string, string> = {};
  try {
    parsedAnswers = JSON.parse(answers || "{}");
  } catch {}

  for (const q of questions) {
    if (q.questionType === "multiple_choice" || q.questionType === "true_false") {
      const studentAnswer = parsedAnswers[q.id.toString()];
      if (studentAnswer && q.correctAnswer && studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        autoScore += q.points;
      }
    }
  }

  // Check if all questions are auto-gradable
  const hasManualQuestions = questions.some(q => q.questionType === "essay" || q.questionType === "file_upload" || q.questionType === "short_answer");
  const status = hasManualQuestions ? "submitted" : "graded";
  const scoreToSet = hasManualQuestions ? autoScore : autoScore;

  const [updated] = await db.update(attemptsTable).set({
    answers,
    status,
    score: scoreToSet,
    maxScore,
    submittedAt: new Date(),
  }).where(eq(attemptsTable.id, attemptId)).returning();

  const [student] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, attempt.studentId));
  const [quiz] = await db.select({ title: quizzesTable.title }).from(quizzesTable).where(eq(quizzesTable.id, attempt.quizId));

  res.json(toAttempt(updated, { studentName: student?.name, quizTitle: quiz?.title }));
});

router.post("/attempts/:attemptId/force-submit", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId;
  const attemptId = parseInt(raw, 10);
  const { reason } = req.body;

  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, attemptId));
  if (!attempt) { res.status(404).json({ error: "Not found" }); return; }

  const [maxScoreRow] = await db.select({ total: sum(questionsTable.points) }).from(questionsTable).where(eq(questionsTable.quizId, attempt.quizId));
  const maxScore = Number(maxScoreRow?.total ?? 0);

  const [updated] = await db.update(attemptsTable).set({
    status: "force_submitted",
    maxScore,
    submittedAt: new Date(),
  }).where(eq(attemptsTable.id, attemptId)).returning();

  // Create alert
  const [student] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, attempt.studentId));
  await db.insert(alertsTable).values({
    attemptId,
    alertType: "force_submitted",
    message: `Exam force-submitted for ${student?.name ?? attempt.studentId} due to ${reason ?? "violation"}`,
  });

  const [quiz] = await db.select({ title: quizzesTable.title }).from(quizzesTable).where(eq(quizzesTable.id, attempt.quizId));
  res.json(toAttempt(updated, { studentName: student?.name, quizTitle: quiz?.title }));
});

router.post("/attempts/:attemptId/heartbeat", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId;
  const attemptId = parseInt(raw, 10);
  const { noiseDetected, movementDetected } = req.body;

  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, attemptId));
  if (!attempt) { res.status(404).json({ error: "Not found" }); return; }

  await db.update(attemptsTable).set({ lastHeartbeat: new Date() }).where(eq(attemptsTable.id, attemptId));

  const [student] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, attempt.studentId));

  if (noiseDetected) {
    await db.insert(alertsTable).values({
      attemptId, alertType: "noise_detected",
      message: `Noise detected for student ${student?.name ?? attempt.studentId}`,
    });
  }
  if (movementDetected) {
    await db.insert(alertsTable).values({
      attemptId, alertType: "movement_detected",
      message: `Excessive movement detected for student ${student?.name ?? attempt.studentId}`,
    });
  }

  // Calculate remaining seconds
  const [quiz] = await db.select({ durationMinutes: quizzesTable.durationMinutes }).from(quizzesTable).where(eq(quizzesTable.id, attempt.quizId));
  let remainingSeconds: number | null = null;
  if (quiz?.durationMinutes) {
    const elapsed = (Date.now() - attempt.startedAt.getTime()) / 1000;
    remainingSeconds = Math.max(0, quiz.durationMinutes * 60 - elapsed);
  }

  res.json({ ok: true, remainingSeconds });
});

export default router;
