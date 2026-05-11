import { Router, type IRouter } from "express";
import { db, attemptsTable, quizzesTable, usersTable, coursesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.patch("/attempts/:attemptId/grade", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId;
  const attemptId = parseInt(raw, 10);
  const { score, feedback } = req.body;
  if (score == null) { res.status(400).json({ error: "Score required" }); return; }

  const [updated] = await db.update(attemptsTable).set({ score, feedback, status: "graded" }).where(eq(attemptsTable.id, attemptId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const [student] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.studentId));
  const [quiz] = await db.select({ title: quizzesTable.title }).from(quizzesTable).where(eq(quizzesTable.id, updated.quizId));

  res.json({ ...updated, studentName: student?.name ?? null, quizTitle: quiz?.title ?? null });
});

router.get("/courses/:courseId/grades", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);

  const quizzes = await db.select({ id: quizzesTable.id, title: quizzesTable.title }).from(quizzesTable).where(eq(quizzesTable.courseId, courseId));
  if (quizzes.length === 0) { res.json([]); return; }

  const quizIds = quizzes.map(q => q.id);
  const quizMap = new Map(quizzes.map(q => [q.id, q.title]));

  const rows = await db.select({
    studentId: attemptsTable.studentId,
    studentName: usersTable.name,
    studentEmail: usersTable.email,
    quizId: attemptsTable.quizId,
    score: attemptsTable.score,
    maxScore: attemptsTable.maxScore,
    status: attemptsTable.status,
    submittedAt: attemptsTable.submittedAt,
  }).from(attemptsTable)
    .leftJoin(usersTable, eq(attemptsTable.studentId, usersTable.id))
    .where(sql`${attemptsTable.quizId} = ANY(${sql.raw(`ARRAY[${quizIds.join(",")}]::int[]`)})`);

  res.json(rows.map(r => ({
    studentId: r.studentId,
    studentName: r.studentName ?? "",
    studentEmail: r.studentEmail ?? "",
    quizTitle: quizMap.get(r.quizId) ?? "",
    score: r.score,
    maxScore: r.maxScore,
    status: r.status,
    submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
  })));
});

router.get("/courses/:courseId/grades/export", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);

  const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, courseId));
  const quizzes = await db.select({ id: quizzesTable.id, title: quizzesTable.title }).from(quizzesTable).where(eq(quizzesTable.courseId, courseId));
  const quizIds = quizzes.map(q => q.id);
  const quizMap = new Map(quizzes.map(q => [q.id, q.title]));

  let rows: any[] = [];
  if (quizIds.length > 0) {
    const dbRows = await db.select({
      studentId: attemptsTable.studentId,
      studentName: usersTable.name,
      studentEmail: usersTable.email,
      quizId: attemptsTable.quizId,
      score: attemptsTable.score,
      maxScore: attemptsTable.maxScore,
      status: attemptsTable.status,
      submittedAt: attemptsTable.submittedAt,
    }).from(attemptsTable)
      .leftJoin(usersTable, eq(attemptsTable.studentId, usersTable.id))
      .where(sql`${attemptsTable.quizId} = ANY(${sql.raw(`ARRAY[${quizIds.join(",")}]::int[]`)})`);

    rows = dbRows.map(r => ({
      studentId: r.studentId,
      studentName: r.studentName ?? "",
      studentEmail: r.studentEmail ?? "",
      quizTitle: quizMap.get(r.quizId) ?? "",
      score: r.score,
      maxScore: r.maxScore,
      status: r.status,
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
    }));
  }

  res.json({ courseName: course?.title ?? "Course", rows });
});

export default router;
