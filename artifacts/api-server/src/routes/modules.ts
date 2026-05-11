import { Router, type IRouter } from "express";
import { db, modulesTable, filesTable, usersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/courses/:courseId/modules", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, courseId)).orderBy(asc(modulesTable.position));
  res.json(modules);
});

router.post("/courses/:courseId/modules", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  const { title, description, position } = req.body;
  if (!title) { res.status(400).json({ error: "Title required" }); return; }
  const [mod] = await db.insert(modulesTable).values({ courseId, title, description, position: position ?? 0 }).returning();
  res.status(201).json(mod);
});

router.patch("/modules/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { title, description, position } = req.body;
  const [mod] = await db.update(modulesTable).set({ title, description, position }).where(eq(modulesTable.id, id)).returning();
  if (!mod) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mod);
});

router.delete("/modules/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(modulesTable).where(eq(modulesTable.id, id));
  res.sendStatus(204);
});

router.get("/modules/:moduleId/files", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.moduleId) ? req.params.moduleId[0] : req.params.moduleId;
  const moduleId = parseInt(raw, 10);
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
  const { moduleId, fileName, originalName, fileType, fileSize, url, uploadedBy } = req.body;
  if (!moduleId || !fileName || !fileType || !url || !uploadedBy) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [file] = await db.insert(filesTable).values({ moduleId, fileName, originalName: originalName ?? fileName, fileType, fileSize, url, uploadedBy }).returning();
  const [uploader] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, uploadedBy));
  res.status(201).json({ ...file, uploaderName: uploader?.name ?? null });
});

router.delete("/files/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(filesTable).where(eq(filesTable.id, id));
  res.sendStatus(204);
});

export default router;
