import { Router, type IRouter } from "express";
import { db, coursesTable, usersTable, enrollmentsTable, quizzesTable, filesTable, modulesTable, alertsTable, attemptsTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/courses", async (_req, res): Promise<void> => {
  const courses = await db.select({
    id: coursesTable.id,
    title: coursesTable.title,
    code: coursesTable.code,
    description: coursesTable.description,
    teacherId: coursesTable.teacherId,
    teacherName: usersTable.name,
    semester: coursesTable.semester,
    academicYear: coursesTable.academicYear,
    isActive: coursesTable.isActive,
    createdAt: coursesTable.createdAt,
  }).from(coursesTable)
    .leftJoin(usersTable, eq(coursesTable.teacherId, usersTable.id))
    .orderBy(coursesTable.title);

  // Get enrollment counts
  const enrollmentCounts = await db.select({
    courseId: enrollmentsTable.courseId,
    count: count(enrollmentsTable.id),
  }).from(enrollmentsTable).groupBy(enrollmentsTable.courseId);
  const countMap = new Map(enrollmentCounts.map(e => [e.courseId, e.count]));

  res.json(courses.map(c => ({ ...c, enrollmentCount: countMap.get(c.id) ?? 0 })));
});

router.post("/courses", async (req, res): Promise<void> => {
  const { title, code, description, teacherId, semester, academicYear } = req.body;
  if (!title || !code || !teacherId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [course] = await db.insert(coursesTable).values({ title, code, description, teacherId, semester, academicYear }).returning();
  const [teacher] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, teacherId));
  res.status(201).json({ ...course, teacherName: teacher?.name ?? null, enrollmentCount: 0 });
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [course] = await db.select({
    id: coursesTable.id,
    title: coursesTable.title,
    code: coursesTable.code,
    description: coursesTable.description,
    teacherId: coursesTable.teacherId,
    teacherName: usersTable.name,
    semester: coursesTable.semester,
    academicYear: coursesTable.academicYear,
    isActive: coursesTable.isActive,
    createdAt: coursesTable.createdAt,
  }).from(coursesTable).leftJoin(usersTable, eq(coursesTable.teacherId, usersTable.id)).where(eq(coursesTable.id, id));
  if (!course) { res.status(404).json({ error: "Not found" }); return; }
  const [ec] = await db.select({ count: count(enrollmentsTable.id) }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, id));
  res.json({ ...course, enrollmentCount: ec?.count ?? 0 });
});

router.patch("/courses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { title, code, description, teacherId, semester, academicYear, isActive } = req.body;
  const [course] = await db.update(coursesTable).set({ title, code, description, teacherId, semester, academicYear, isActive }).where(eq(coursesTable.id, id)).returning();
  if (!course) { res.status(404).json({ error: "Not found" }); return; }
  const [teacher] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, course.teacherId));
  res.json({ ...course, teacherName: teacher?.name ?? null, enrollmentCount: 0 });
});

router.delete("/courses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(coursesTable).where(eq(coursesTable.id, id));
  res.sendStatus(204);
});

router.get("/courses/:id/dashboard", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [enrollCount] = await db.select({ count: count(enrollmentsTable.id) }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, id));
  const [quizCount] = await db.select({ count: count(quizzesTable.id) }).from(quizzesTable).where(eq(quizzesTable.courseId, id));

  const modules = await db.select({ id: modulesTable.id }).from(modulesTable).where(eq(modulesTable.courseId, id));
  const moduleIds = modules.map(m => m.id);
  let fileCount = 0;
  if (moduleIds.length > 0) {
    const [fc] = await db.select({ count: count(filesTable.id) }).from(filesTable).where(sql`${filesTable.moduleId} = ANY(${sql.raw(`ARRAY[${moduleIds.join(",")}]`)})`);
    fileCount = Number(fc?.count ?? 0);
  }

  // Count pending grades (submitted attempts with no score)
  const quizzes = await db.select({ id: quizzesTable.id }).from(quizzesTable).where(eq(quizzesTable.courseId, id));
  const quizIds = quizzes.map(q => q.id);
  let pendingGrades = 0;
  if (quizIds.length > 0) {
    const [pg] = await db.select({ count: count(attemptsTable.id) }).from(attemptsTable).where(sql`${attemptsTable.quizId} = ANY(${sql.raw(`ARRAY[${quizIds.join(",")}]`)}) AND ${attemptsTable.status} IN ('submitted', 'force_submitted') AND ${attemptsTable.score} IS NULL`);
    pendingGrades = Number(pg?.count ?? 0);
  }

  // Recent alerts count
  const [alertCount] = await db.select({ count: count(alertsTable.id) }).from(alertsTable).leftJoin(attemptsTable, eq(alertsTable.attemptId, attemptsTable.id)).where(sql`${attemptsTable.quizId} = ANY(${quizIds.length > 0 ? sql.raw(`ARRAY[${quizIds.join(",")}]`) : sql.raw("ARRAY[]::int[]")}) AND ${alertsTable.resolved} = false`);

  res.json({
    courseId: id,
    enrolledStudents: Number(enrollCount?.count ?? 0),
    totalQuizzes: Number(quizCount?.count ?? 0),
    totalFiles: fileCount,
    pendingGrades,
    recentAlerts: Number(alertCount?.count ?? 0),
  });
});

export default router;
