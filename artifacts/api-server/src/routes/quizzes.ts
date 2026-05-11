import { Router, type IRouter } from "express";
import { db, quizzesTable, questionsTable, attemptsTable, usersTable, alertsTable } from "@workspace/db";
import { eq, count, sum, asc } from "drizzle-orm";

const router: IRouter = Router();

const toQuiz = (q: typeof quizzesTable.$inferSelect, extra?: { questionCount?: number; totalPoints?: number }) => ({
  ...q,
  questionCount: extra?.questionCount ?? null,
  totalPoints: extra?.totalPoints ?? null,
});

router.get("/courses/:courseId/quizzes", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  const quizzes = await db.select().from(quizzesTable).where(eq(quizzesTable.courseId, courseId)).orderBy(quizzesTable.createdAt);

  const quizIds = quizzes.map(q => q.id);
  const questionStats: Record<number, { count: number; points: number }> = {};
  if (quizIds.length > 0) {
    for (const qz of quizzes) {
      const rows = await db.select({ cnt: count(questionsTable.id), pts: sum(questionsTable.points) }).from(questionsTable).where(eq(questionsTable.quizId, qz.id));
      questionStats[qz.id] = { count: Number(rows[0]?.cnt ?? 0), points: Number(rows[0]?.pts ?? 0) };
    }
  }

  res.json(quizzes.map(q => toQuiz(q, { questionCount: questionStats[q.id]?.count, totalPoints: questionStats[q.id]?.points })));
});

router.post("/courses/:courseId/quizzes", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  const { title, description, quizType, isLockdown, lockdownCamera, lockdownMic, durationMinutes, startTime, endTime, maxAttempts, isPublished } = req.body;
  if (!title || !quizType) { res.status(400).json({ error: "Missing required fields" }); return; }
  const [quiz] = await db.insert(quizzesTable).values({
    courseId, title, description, quizType, isLockdown: isLockdown ?? false,
    lockdownCamera: lockdownCamera ?? false, lockdownMic: lockdownMic ?? false,
    durationMinutes, startTime: startTime ? new Date(startTime) : undefined,
    endTime: endTime ? new Date(endTime) : undefined, maxAttempts: maxAttempts ?? 1,
    isPublished: isPublished ?? false,
  }).returning();
  res.status(201).json(toQuiz(quiz, { questionCount: 0, totalPoints: 0 }));
});

router.get("/quizzes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, id));
  if (!quiz) { res.status(404).json({ error: "Not found" }); return; }
  const [stats] = await db.select({ cnt: count(questionsTable.id), pts: sum(questionsTable.points) }).from(questionsTable).where(eq(questionsTable.quizId, id));
  res.json(toQuiz(quiz, { questionCount: Number(stats?.cnt ?? 0), totalPoints: Number(stats?.pts ?? 0) }));
});

router.patch("/quizzes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { title, description, isLockdown, lockdownCamera, lockdownMic, durationMinutes, startTime, endTime, maxAttempts, isPublished } = req.body;
  const [quiz] = await db.update(quizzesTable).set({
    title, description, isLockdown, lockdownCamera, lockdownMic, durationMinutes,
    startTime: startTime ? new Date(startTime) : undefined,
    endTime: endTime ? new Date(endTime) : undefined,
    maxAttempts, isPublished,
  }).where(eq(quizzesTable.id, id)).returning();
  if (!quiz) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toQuiz(quiz));
});

router.delete("/quizzes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(quizzesTable).where(eq(quizzesTable.id, id));
  res.sendStatus(204);
});

router.post("/quizzes/:id/start", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { studentId } = req.body;
  if (!studentId) { res.status(400).json({ error: "studentId required" }); return; }

  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, id));
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }

  // Check if late
  let lateEntry = false;
  let lateMinutes = 0;
  if (quiz.startTime) {
    const diffMs = Date.now() - quiz.startTime.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin >= 10) {
      lateEntry = true;
      lateMinutes = diffMin;
    }
  }

  const [attempt] = await db.insert(attemptsTable).values({
    quizId: id, studentId, status: "in_progress", lateEntry, lateMinutes: lateEntry ? lateMinutes : null,
  }).returning();

  const [student] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, studentId));

  // Auto-create late_entry alert
  if (lateEntry) {
    await db.insert(alertsTable).values({
      attemptId: attempt.id,
      alertType: "late_entry",
      message: `Student ${student?.name ?? studentId} joined ${lateMinutes} minutes late`,
    });
  }

  res.json({
    ...attempt,
    studentName: student?.name ?? null,
    quizTitle: quiz.title,
  });
});

router.get("/quizzes/:id/attempts", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const rows = await db.select({
    id: attemptsTable.id,
    quizId: attemptsTable.quizId,
    studentId: attemptsTable.studentId,
    studentName: usersTable.name,
    status: attemptsTable.status,
    score: attemptsTable.score,
    maxScore: attemptsTable.maxScore,
    answers: attemptsTable.answers,
    feedback: attemptsTable.feedback,
    startedAt: attemptsTable.startedAt,
    submittedAt: attemptsTable.submittedAt,
    lateEntry: attemptsTable.lateEntry,
    lateMinutes: attemptsTable.lateMinutes,
  }).from(attemptsTable)
    .leftJoin(usersTable, eq(attemptsTable.studentId, usersTable.id))
    .where(eq(attemptsTable.quizId, id));

  const [quiz] = await db.select({ title: quizzesTable.title }).from(quizzesTable).where(eq(quizzesTable.id, id));
  res.json(rows.map(r => ({ ...r, quizTitle: quiz?.title ?? null })));
});

export default router;
