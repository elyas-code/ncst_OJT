import { Router, type IRouter } from "express";
import { db, discussionsTable, discussionRepliesTable, usersTable } from "@workspace/db";
import { eq, desc, asc, sql } from "drizzle-orm";
import { requireAuth, courseAccess, isStaff, getDiscussionCourseId, getReplyContext } from "../lib/authz.js";

const router: IRouter = Router();

router.get("/courses/:courseId/discussions", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const courseId = parseInt(req.params.courseId, 10);
  if (!Number.isFinite(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!lvl) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db
    .select({
      id: discussionsTable.id, courseId: discussionsTable.courseId,
      title: discussionsTable.title, body: discussionsTable.body,
      authorId: discussionsTable.authorId, authorName: usersTable.name, authorRole: usersTable.role,
      isPinned: discussionsTable.isPinned, isLocked: discussionsTable.isLocked, createdAt: discussionsTable.createdAt,
      replyCount: sql<number>`(SELECT count(*)::int FROM ${discussionRepliesTable} WHERE ${discussionRepliesTable.discussionId} = ${discussionsTable.id})`.as("reply_count"),
      lastReplyAt: sql<string | null>`(SELECT max(created_at) FROM ${discussionRepliesTable} WHERE ${discussionRepliesTable.discussionId} = ${discussionsTable.id})`.as("last_reply_at"),
    })
    .from(discussionsTable)
    .leftJoin(usersTable, eq(discussionsTable.authorId, usersTable.id))
    .where(eq(discussionsTable.courseId, courseId))
    .orderBy(desc(discussionsTable.isPinned), desc(discussionsTable.createdAt));
  res.json(rows);
});

router.post("/courses/:courseId/discussions", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const courseId = parseInt(req.params.courseId, 10);
  if (!Number.isFinite(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!lvl) { res.status(403).json({ error: "Not enrolled in this course" }); return; }
  const { title, body, isPinned } = req.body ?? {};
  if (!title || !body) { res.status(400).json({ error: "Title and body required" }); return; }
  // Only staff can pin
  const pin = isPinned && isStaff(lvl);
  const [d] = await db.insert(discussionsTable).values({ courseId, title, body, authorId: userId, isPinned: !!pin }).returning();
  res.status(201).json(d);
});

router.get("/discussions/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ctx = await getDiscussionCourseId(id);
  if (!ctx) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, ctx.courseId);
  if (!lvl) { res.status(403).json({ error: "Forbidden" }); return; }
  const [d] = await db
    .select({
      id: discussionsTable.id, courseId: discussionsTable.courseId,
      title: discussionsTable.title, body: discussionsTable.body,
      authorId: discussionsTable.authorId, authorName: usersTable.name, authorRole: usersTable.role,
      isPinned: discussionsTable.isPinned, isLocked: discussionsTable.isLocked, createdAt: discussionsTable.createdAt,
    })
    .from(discussionsTable)
    .leftJoin(usersTable, eq(discussionsTable.authorId, usersTable.id))
    .where(eq(discussionsTable.id, id));
  res.json(d);
});

router.delete("/discussions/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ctx = await getDiscussionCourseId(id);
  if (!ctx) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, ctx.courseId);
  if (!isStaff(lvl) && ctx.authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(discussionsTable).where(eq(discussionsTable.id, id));
  res.sendStatus(204);
});

router.patch("/discussions/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ctx = await getDiscussionCourseId(id);
  if (!ctx) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, ctx.courseId);
  const isAuthor = ctx.authorId === userId;
  const staff = isStaff(lvl);
  if (!staff && !isAuthor) { res.status(403).json({ error: "Forbidden" }); return; }
  const { isPinned, isLocked, title, body } = req.body ?? {};
  const patch: any = {};
  if (title !== undefined && (isAuthor || staff)) patch.title = title;
  if (body !== undefined && (isAuthor || staff)) patch.body = body;
  // Only staff can pin or lock
  if (isPinned !== undefined && staff) patch.isPinned = isPinned;
  if (isLocked !== undefined && staff) patch.isLocked = isLocked;
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
  const [d] = await db.update(discussionsTable).set(patch).where(eq(discussionsTable.id, id)).returning();
  res.json(d);
});

router.get("/discussions/:id/replies", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ctx = await getDiscussionCourseId(id);
  if (!ctx) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, ctx.courseId);
  if (!lvl) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db
    .select({
      id: discussionRepliesTable.id, discussionId: discussionRepliesTable.discussionId,
      parentReplyId: discussionRepliesTable.parentReplyId, authorId: discussionRepliesTable.authorId,
      authorName: usersTable.name, authorRole: usersTable.role,
      body: discussionRepliesTable.body, createdAt: discussionRepliesTable.createdAt,
    })
    .from(discussionRepliesTable)
    .leftJoin(usersTable, eq(discussionRepliesTable.authorId, usersTable.id))
    .where(eq(discussionRepliesTable.discussionId, id))
    .orderBy(asc(discussionRepliesTable.createdAt));
  res.json(rows);
});

router.post("/discussions/:id/replies", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [d] = await db.select({ courseId: discussionsTable.courseId, isLocked: discussionsTable.isLocked }).from(discussionsTable).where(eq(discussionsTable.id, id));
  if (!d) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, d.courseId);
  if (!lvl) { res.status(403).json({ error: "Forbidden" }); return; }
  if (d.isLocked && !isStaff(lvl)) { res.status(403).json({ error: "Thread is locked" }); return; }
  const { body, parentReplyId } = req.body ?? {};
  if (!body) { res.status(400).json({ error: "Body required" }); return; }
  const [r] = await db.insert(discussionRepliesTable)
    .values({ discussionId: id, authorId: userId, body, parentReplyId: parentReplyId ?? null })
    .returning();
  res.status(201).json(r);
});

router.delete("/discussion-replies/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ctx = await getReplyContext(id);
  if (!ctx) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, ctx.courseId);
  if (!isStaff(lvl) && ctx.authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(discussionRepliesTable).where(eq(discussionRepliesTable.id, id));
  res.sendStatus(204);
});

export default router;
