import { Router, type IRouter } from "express";
import { db, announcementsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, courseAccess, isStaff } from "../lib/authz.js";
import { validateAttachmentUrl, sanitizeSize } from "../lib/attachments.js";

const router: IRouter = Router();

router.get("/courses/:courseId/announcements", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  if (!Number.isFinite(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!lvl) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select({
    id: announcementsTable.id,
    courseId: announcementsTable.courseId,
    title: announcementsTable.title,
    content: announcementsTable.content,
    authorId: announcementsTable.authorId,
    authorName: usersTable.name,
    attachmentUrl: announcementsTable.attachmentUrl,
    attachmentName: announcementsTable.attachmentName,
    attachmentType: announcementsTable.attachmentType,
    attachmentSize: announcementsTable.attachmentSize,
    createdAt: announcementsTable.createdAt,
  }).from(announcementsTable)
    .leftJoin(usersTable, eq(announcementsTable.authorId, usersTable.id))
    .where(eq(announcementsTable.courseId, courseId))
    .orderBy(desc(announcementsTable.createdAt));
  res.json(rows);
});

router.post("/courses/:courseId/announcements", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  if (!Number.isFinite(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Only teachers and admins can post announcements" }); return; }
  const { title, content, attachmentUrl, attachmentName, attachmentType, attachmentSize } = req.body ?? {};
  if (!title || !content) { res.status(400).json({ error: "Title and content required" }); return; }
  const v = validateAttachmentUrl(attachmentUrl);
  if (!v.ok) { res.status(400).json({ error: v.error }); return; }
  const [ann] = await db.insert(announcementsTable).values({
    courseId, title, content, authorId: userId,
    attachmentUrl: attachmentUrl ?? null,
    attachmentName: attachmentName ?? null,
    attachmentType: attachmentType ?? null,
    attachmentSize: sanitizeSize(attachmentSize),
  }).returning();
  const [author] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json({ ...ann, authorName: author?.name ?? null });
});

router.delete("/announcements/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [ann] = await db.select({ courseId: announcementsTable.courseId, authorId: announcementsTable.authorId }).from(announcementsTable).where(eq(announcementsTable.id, id));
  if (!ann) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, ann.courseId);
  if (!isStaff(lvl) && ann.authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.sendStatus(204);
});

export default router;
