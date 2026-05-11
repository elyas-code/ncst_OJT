import { Router, type IRouter } from "express";
import { db, announcementsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/courses/:courseId/announcements", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  const rows = await db.select({
    id: announcementsTable.id,
    courseId: announcementsTable.courseId,
    title: announcementsTable.title,
    content: announcementsTable.content,
    authorId: announcementsTable.authorId,
    authorName: usersTable.name,
    createdAt: announcementsTable.createdAt,
  }).from(announcementsTable)
    .leftJoin(usersTable, eq(announcementsTable.authorId, usersTable.id))
    .where(eq(announcementsTable.courseId, courseId))
    .orderBy(desc(announcementsTable.createdAt));
  res.json(rows);
});

router.post("/courses/:courseId/announcements", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  const { title, content, authorId } = req.body;
  if (!title || !content || !authorId) { res.status(400).json({ error: "Missing required fields" }); return; }
  const [ann] = await db.insert(announcementsTable).values({ courseId, title, content, authorId }).returning();
  const [author] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, authorId));
  res.status(201).json({ ...ann, authorName: author?.name ?? null });
});

router.delete("/announcements/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.sendStatus(204);
});

export default router;
