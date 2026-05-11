import { Router, type IRouter } from "express";
import { db, alertsTable, attemptsTable, usersTable, quizzesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

const enrichAlert = async (alert: typeof alertsTable.$inferSelect) => {
  const [attempt] = await db.select({ studentId: attemptsTable.studentId, quizId: attemptsTable.quizId }).from(attemptsTable).where(eq(attemptsTable.id, alert.attemptId));
  if (!attempt) return { ...alert, studentId: null, studentName: null, quizTitle: null };
  const [student] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, attempt.studentId));
  const [quiz] = await db.select({ title: quizzesTable.title }).from(quizzesTable).where(eq(quizzesTable.id, attempt.quizId));
  return { ...alert, studentId: attempt.studentId, studentName: student?.name ?? null, quizTitle: quiz?.title ?? null };
};

router.get("/alerts", async (_req, res): Promise<void> => {
  const alerts = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt)).limit(100);
  const enriched = await Promise.all(alerts.map(enrichAlert));
  res.json(enriched);
});

router.post("/alerts", async (req, res): Promise<void> => {
  const { attemptId, alertType, message } = req.body;
  if (!attemptId || !alertType || !message) { res.status(400).json({ error: "Missing required fields" }); return; }
  const [alert] = await db.insert(alertsTable).values({ attemptId, alertType, message }).returning();
  const enriched = await enrichAlert(alert);
  res.status(201).json(enriched);
});

router.patch("/alerts/:id/resolve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { resolvedNote } = req.body;
  const [alert] = await db.update(alertsTable).set({ resolved: true, resolvedNote }).where(eq(alertsTable.id, id)).returning();
  if (!alert) { res.status(404).json({ error: "Not found" }); return; }
  const enriched = await enrichAlert(alert);
  res.json(enriched);
});

router.get("/attempts/:attemptId/alerts", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId;
  const attemptId = parseInt(raw, 10);
  const alerts = await db.select().from(alertsTable).where(eq(alertsTable.attemptId, attemptId)).orderBy(desc(alertsTable.createdAt));
  const enriched = await Promise.all(alerts.map(enrichAlert));
  res.json(enriched);
});

export default router;
