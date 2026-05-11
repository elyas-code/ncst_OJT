import { Router, type IRouter } from "express";
import { db, questionsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/quizzes/:quizId/questions", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.quizId) ? req.params.quizId[0] : req.params.quizId;
  const quizId = parseInt(raw, 10);
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.quizId, quizId)).orderBy(asc(questionsTable.position));
  res.json(questions);
});

router.post("/quizzes/:quizId/questions", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.quizId) ? req.params.quizId[0] : req.params.quizId;
  const quizId = parseInt(raw, 10);
  const { questionText, questionType, points, position, options, correctAnswer, explanation } = req.body;
  if (!questionText || !questionType) { res.status(400).json({ error: "Missing required fields" }); return; }
  const [q] = await db.insert(questionsTable).values({
    quizId, questionText, questionType, points: points ?? 1, position: position ?? 0,
    options, correctAnswer, explanation,
  }).returning();
  res.status(201).json(q);
});

router.patch("/questions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { questionText, questionType, points, position, options, correctAnswer, explanation } = req.body;
  const [q] = await db.update(questionsTable).set({ questionText, questionType, points, position, options, correctAnswer, explanation }).where(eq(questionsTable.id, id)).returning();
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  res.json(q);
});

router.delete("/questions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(questionsTable).where(eq(questionsTable.id, id));
  res.sendStatus(204);
});

export default router;
