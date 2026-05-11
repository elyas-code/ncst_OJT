import { Router, type IRouter } from "express";
import { db, modulesTable, filesTable, usersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth, courseAccess, isStaff } from "../lib/authz.js";
import { validateAttachmentUrl, sanitizeSize } from "../lib/attachments.js";

const router: IRouter = Router();

async function getModuleCourseId(id: number): Promise<number | null> {
  const [m] = await db.select({ courseId: modulesTable.courseId }).from(modulesTable).where(eq(modulesTable.id, id));
  return m?.courseId ?? null;
}

router.get("/courses/:courseId/modules", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  if (!Number.isFinite(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!lvl) { res.status(403).json({ error: "Forbidden" }); return; }
  const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, courseId)).orderBy(asc(modulesTable.position));
  res.json(modules);
});

router.post("/courses/:courseId/modules", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  if (!Number.isFinite(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Only teachers and admins can add modules" }); return; }
  const { title, description, position } = req.body ?? {};
  if (!title) { res.status(400).json({ error: "Title required" }); return; }
  const [mod] = await db.insert(modulesTable).values({ courseId, title, description, position: position ?? 0 }).returning();
  res.status(201).json(mod);
});

router.patch("/modules/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const courseId = await getModuleCourseId(id);
  if (!courseId) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Forbidden" }); return; }
  const { title, description, position } = req.body ?? {};
  const patch: any = {};
  if (title !== undefined) patch.title = title;
  if (description !== undefined) patch.description = description;
  if (position !== undefined) patch.position = position;
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
  const [mod] = await db.update(modulesTable).set(patch).where(eq(modulesTable.id, id)).returning();
  res.json(mod);
});

router.delete("/modules/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const courseId = await getModuleCourseId(id);
  if (!courseId) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(modulesTable).where(eq(modulesTable.id, id));
  res.sendStatus(204);
});

router.get("/modules/:moduleId/files", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.moduleId) ? req.params.moduleId[0] : req.params.moduleId;
  const moduleId = parseInt(raw, 10);
  if (!Number.isFinite(moduleId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const courseId = await getModuleCourseId(moduleId);
  if (!courseId) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!lvl) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select({
    id: filesTable.id,
    moduleId: filesTable.moduleId,
    fileName: filesTable.fileName,
    originalName: filesTable.originalName,
    fileType: filesTable.fileType,
    fileSize: filesTable.fileSize,
    url: filesTable.url,
    uploadedBy: filesTable.uploadedBy,
    uploaderName: usersTable.name,
    createdAt: filesTable.createdAt,
  }).from(filesTable).leftJoin(usersTable, eq(filesTable.uploadedBy, usersTable.id)).where(eq(filesTable.moduleId, moduleId));
  res.json(rows);
});

router.post("/files", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const { moduleId, fileName, originalName, fileType, fileSize, url } = req.body ?? {};
  if (!moduleId || !fileName || !fileType || !url) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const courseId = await getModuleCourseId(moduleId);
  if (!courseId) { res.status(404).json({ error: "Module not found" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Only teachers and admins can upload materials" }); return; }
  const v = validateAttachmentUrl(url);
  if (!v.ok) { res.status(400).json({ error: v.error }); return; }
  const safeSize = sanitizeSize(fileSize);
  const safeType = typeof fileType === "string" ? fileType.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) : "other";
  const [file] = await db.insert(filesTable).values({
    moduleId, fileName, originalName: originalName ?? fileName, fileType: safeType, fileSize: safeSize, url, uploadedBy: userId,
  }).returning();
  const [uploader] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json({ ...file, uploaderName: uploader?.name ?? null });
});

router.delete("/files/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [f] = await db
    .select({ courseId: modulesTable.courseId })
    .from(filesTable)
    .leftJoin(modulesTable, eq(filesTable.moduleId, modulesTable.id))
    .where(eq(filesTable.id, id));
  if (!f?.courseId) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, f.courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(filesTable).where(eq(filesTable.id, id));
  res.sendStatus(204);
});

export default router;
