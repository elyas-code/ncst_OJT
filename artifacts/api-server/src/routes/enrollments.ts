import { Router, type IRouter } from "express";
import { db, enrollmentsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/enrollments", async (_req, res): Promise<void> => {
  const rows = await db.select({
    id: enrollmentsTable.id,
    courseId: enrollmentsTable.courseId,
    studentId: enrollmentsTable.studentId,
    studentName: usersTable.name,
    studentEmail: usersTable.email,
    enrolledAt: enrollmentsTable.enrolledAt,
  }).from(enrollmentsTable).leftJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id));
  res.json(rows);
});

router.post("/enrollments", async (req, res): Promise<void> => {
  const { courseId, studentId } = req.body;
  if (!courseId || !studentId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [enrollment] = await db.insert(enrollmentsTable).values({ courseId, studentId }).returning();
  const [student] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, studentId));
  res.status(201).json({ ...enrollment, studentName: student?.name ?? null, studentEmail: student?.email ?? null });
});

router.delete("/enrollments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(enrollmentsTable).where(eq(enrollmentsTable.id, id));
  res.sendStatus(204);
});

export default router;
