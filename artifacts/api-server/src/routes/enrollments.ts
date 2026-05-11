import { Router, type IRouter } from "express";
import { db, enrollmentsTable, usersTable, coursesTable } from "@workspace/db";
import { eq, inArray, and } from "drizzle-orm";
import { requireAuth, getRole, courseAccess, isStaff } from "../lib/authz.js";

const router: IRouter = Router();

router.get("/enrollments", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const role = await getRole(userId);

  const baseSelect = {
    id: enrollmentsTable.id,
    courseId: enrollmentsTable.courseId,
    studentId: enrollmentsTable.studentId,
    studentName: usersTable.name,
    studentEmail: usersTable.email,
    enrolledAt: enrollmentsTable.enrolledAt,
  };

  if (role === "admin") {
    const rows = await db.select(baseSelect).from(enrollmentsTable)
      .leftJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id));
    res.json(rows); return;
  }
  if (role === "teacher") {
    const owned = await db.select({ id: coursesTable.id }).from(coursesTable).where(eq(coursesTable.teacherId, userId));
    const ids = owned.map(c => c.id);
    if (ids.length === 0) { res.json([]); return; }
    const rows = await db.select(baseSelect).from(enrollmentsTable)
      .leftJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
      .where(inArray(enrollmentsTable.courseId, ids));
    res.json(rows); return;
  }
  // students see only their own enrollments
  const rows = await db.select(baseSelect).from(enrollmentsTable)
    .leftJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
    .where(eq(enrollmentsTable.studentId, userId));
  res.json(rows);
});

router.post("/enrollments", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const { courseId, studentId } = req.body;
  if (!courseId || !studentId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const lvl = await courseAccess(userId, courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Only the course teacher or an admin can enroll students" }); return; }
  const [enrollment] = await db.insert(enrollmentsTable).values({ courseId, studentId }).returning();
  const [student] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, studentId));
  res.status(201).json({ ...enrollment, studentName: student?.name ?? null, studentEmail: student?.email ?? null });
});

router.delete("/enrollments/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [en] = await db.select({ courseId: enrollmentsTable.courseId }).from(enrollmentsTable).where(eq(enrollmentsTable.id, id));
  if (!en) { res.sendStatus(204); return; }
  const lvl = await courseAccess(userId, en.courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Only the course teacher or an admin can remove students" }); return; }
  await db.delete(enrollmentsTable).where(eq(enrollmentsTable.id, id));
  res.sendStatus(204);
});

export default router;
