import { Router, type IRouter } from "express";
import { db, assignmentsTable, assignmentSubmissionsTable, usersTable, coursesTable, enrollmentsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, courseAccess, isStaff, getRole, getAssignmentCourseId, getSubmissionContext } from "../lib/authz.js";
import { validateAttachmentUrl, sanitizeSize } from "../lib/attachments.js";

const router: IRouter = Router();

router.get("/courses/:courseId/assignments", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const courseId = parseInt(req.params.courseId, 10);
  if (!Number.isFinite(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!lvl) { res.status(403).json({ error: "Not enrolled in this course" }); return; }
  const rows = await db
    .select({
      id: assignmentsTable.id, courseId: assignmentsTable.courseId, title: assignmentsTable.title,
      description: assignmentsTable.description, instructions: assignmentsTable.instructions,
      dueAt: assignmentsTable.dueAt, points: assignmentsTable.points,
      allowFile: assignmentsTable.allowFile, allowText: assignmentsTable.allowText,
      isPublished: assignmentsTable.isPublished, createdAt: assignmentsTable.createdAt,
      submissionCount: sql<number>`(SELECT count(*)::int FROM ${assignmentSubmissionsTable} WHERE ${assignmentSubmissionsTable.assignmentId} = ${assignmentsTable.id})`.as("submission_count"),
    })
    .from(assignmentsTable)
    .where(eq(assignmentsTable.courseId, courseId))
    .orderBy(desc(assignmentsTable.createdAt));
  // Students only see published assignments
  const filtered = lvl === "student" ? rows.filter(r => r.isPublished) : rows;
  res.json(filtered);
});

router.post("/courses/:courseId/assignments", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const courseId = parseInt(req.params.courseId, 10);
  if (!Number.isFinite(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Only teachers and admins can create assignments" }); return; }
  const { title, description, instructions, dueAt, points, allowFile, allowText, isPublished,
          attachmentUrl, attachmentName, attachmentType, attachmentSize } = req.body ?? {};
  if (!title) { res.status(400).json({ error: "Title required" }); return; }
  const av = validateAttachmentUrl(attachmentUrl);
  if (!av.ok) { res.status(400).json({ error: av.error }); return; }
  const [a] = await db.insert(assignmentsTable).values({
    courseId, title,
    description: description ?? null,
    instructions: instructions ?? null,
    dueAt: dueAt ? new Date(dueAt) : null,
    points: typeof points === "number" ? points : 100,
    allowFile: allowFile ?? true,
    allowText: allowText ?? true,
    isPublished: isPublished ?? true,
    attachmentUrl: attachmentUrl ?? null,
    attachmentName: attachmentName ?? null,
    attachmentType: attachmentType ?? null,
    attachmentSize: sanitizeSize(attachmentSize),
    createdBy: userId,
  }).returning();
  res.status(201).json(a);
});

router.get("/assignments/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [a] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id));
  if (!a) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, a.courseId);
  if (!lvl) { res.status(403).json({ error: "Forbidden" }); return; }
  if (lvl === "student" && !a.isPublished) { res.status(404).json({ error: "Not found" }); return; }
  const [course] = await db.select({ title: coursesTable.title, code: coursesTable.code }).from(coursesTable).where(eq(coursesTable.id, a.courseId));
  res.json({ ...a, courseName: course?.title, courseCode: course?.code });
});

router.patch("/assignments/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const courseId = await getAssignmentCourseId(id);
  if (!courseId) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Forbidden" }); return; }
  const { title, description, instructions, dueAt, points, allowFile, allowText, isPublished,
          attachmentUrl, attachmentName, attachmentType, attachmentSize } = req.body ?? {};
  const patch: any = {};
  if (title !== undefined) patch.title = title;
  if (description !== undefined) patch.description = description;
  if (instructions !== undefined) patch.instructions = instructions;
  if (dueAt !== undefined) patch.dueAt = dueAt ? new Date(dueAt) : null;
  if (points !== undefined) patch.points = points;
  if (allowFile !== undefined) patch.allowFile = allowFile;
  if (allowText !== undefined) patch.allowText = allowText;
  if (isPublished !== undefined) patch.isPublished = isPublished;
  if (attachmentUrl !== undefined) {
    const v = validateAttachmentUrl(attachmentUrl);
    if (!v.ok) { res.status(400).json({ error: v.error }); return; }
    patch.attachmentUrl = attachmentUrl;
  }
  if (attachmentName !== undefined) patch.attachmentName = attachmentName;
  if (attachmentType !== undefined) patch.attachmentType = attachmentType;
  if (attachmentSize !== undefined) patch.attachmentSize = sanitizeSize(attachmentSize);
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
  const [a] = await db.update(assignmentsTable).set(patch).where(eq(assignmentsTable.id, id)).returning();
  res.json(a);
});

router.delete("/assignments/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const courseId = await getAssignmentCourseId(id);
  if (!courseId) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(assignmentsTable).where(eq(assignmentsTable.id, id));
  res.sendStatus(204);
});

router.get("/assignments/:id/submissions", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const courseId = await getAssignmentCourseId(id);
  if (!courseId) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Only teachers and admins can view all submissions" }); return; }
  const rows = await db
    .select({
      id: assignmentSubmissionsTable.id, assignmentId: assignmentSubmissionsTable.assignmentId,
      studentId: assignmentSubmissionsTable.studentId, studentName: usersTable.name, studentEmail: usersTable.email,
      content: assignmentSubmissionsTable.content, fileUrl: assignmentSubmissionsTable.fileUrl,
      fileName: assignmentSubmissionsTable.fileName, fileSize: assignmentSubmissionsTable.fileSize,
      submittedAt: assignmentSubmissionsTable.submittedAt,
      grade: assignmentSubmissionsTable.grade, feedback: assignmentSubmissionsTable.feedback, gradedAt: assignmentSubmissionsTable.gradedAt,
    })
    .from(assignmentSubmissionsTable)
    .leftJoin(usersTable, eq(assignmentSubmissionsTable.studentId, usersTable.id))
    .where(eq(assignmentSubmissionsTable.assignmentId, id))
    .orderBy(desc(assignmentSubmissionsTable.submittedAt));
  res.json(rows);
});

router.get("/assignments/:id/my-submission", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const courseId = await getAssignmentCourseId(id);
  if (!courseId) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, courseId);
  if (lvl !== "student") { res.status(403).json({ error: "Only enrolled students have personal submissions" }); return; }
  const [row] = await db
    .select()
    .from(assignmentSubmissionsTable)
    .where(and(eq(assignmentSubmissionsTable.assignmentId, id), eq(assignmentSubmissionsTable.studentId, userId)))
    .orderBy(desc(assignmentSubmissionsTable.submittedAt))
    .limit(1);
  res.json(row ?? null);
});

router.post("/assignments/:id/submissions", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [a] = await db.select({ courseId: assignmentsTable.courseId, isPublished: assignmentsTable.isPublished }).from(assignmentsTable).where(eq(assignmentsTable.id, id));
  if (!a || !a.isPublished) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, a.courseId);
  if (lvl !== "student") { res.status(403).json({ error: "Only enrolled students can submit" }); return; }
  const { content, fileUrl, fileName, fileSize } = req.body ?? {};
  if (!content && !fileUrl) { res.status(400).json({ error: "Provide text or a file" }); return; }
  const [existing] = await db.select().from(assignmentSubmissionsTable)
    .where(and(eq(assignmentSubmissionsTable.assignmentId, id), eq(assignmentSubmissionsTable.studentId, userId)));
  if (existing) {
    const [updated] = await db.update(assignmentSubmissionsTable)
      .set({ content: content ?? null, fileUrl: fileUrl ?? null, fileName: fileName ?? null, fileSize: fileSize ?? null, submittedAt: new Date(), grade: null, feedback: null, gradedAt: null, gradedBy: null })
      .where(eq(assignmentSubmissionsTable.id, existing.id))
      .returning();
    res.status(200).json(updated);
    return;
  }
  const [s] = await db.insert(assignmentSubmissionsTable).values({
    assignmentId: id, studentId: userId,
    content: content ?? null, fileUrl: fileUrl ?? null, fileName: fileName ?? null, fileSize: fileSize ?? null,
  }).returning();
  res.status(201).json(s);
});

router.patch("/assignment-submissions/:id/grade", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const ctx = await getSubmissionContext(id);
  if (!ctx) { res.status(404).json({ error: "Not found" }); return; }
  const lvl = await courseAccess(userId, ctx.courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Only teachers and admins can grade" }); return; }
  const { grade, feedback } = req.body ?? {};
  if (typeof grade !== "number" || !Number.isFinite(grade)) { res.status(400).json({ error: "Numeric grade required" }); return; }
  const [s] = await db.update(assignmentSubmissionsTable)
    .set({ grade, feedback: feedback ?? null, gradedAt: new Date(), gradedBy: userId })
    .where(eq(assignmentSubmissionsTable.id, id))
    .returning();
  res.json(s);
});

// Calendar / upcoming endpoint — assignments + quizzes due in next N days, scoped to user
router.get("/calendar/upcoming", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const daysRaw = parseInt((req.query.days as string) ?? "14", 10);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 365) : 14;
  const horizon = new Date(Date.now() + days * 24 * 3600 * 1000);
  const now = new Date();
  const role = await getRole(userId);
  let courseIds: number[] = [];
  if (role === "student") {
    const en = await db.select({ courseId: enrollmentsTable.courseId }).from(enrollmentsTable).where(eq(enrollmentsTable.studentId, userId));
    courseIds = en.map(e => e.courseId);
  } else if (role === "teacher") {
    const cs = await db.select({ id: coursesTable.id }).from(coursesTable).where(eq(coursesTable.teacherId, userId));
    courseIds = cs.map(c => c.id);
  } else if (role === "admin") {
    const cs = await db.select({ id: coursesTable.id }).from(coursesTable);
    courseIds = cs.map(c => c.id);
  }
  if (courseIds.length === 0) { res.json([]); return; }
  const idList = sql.join(courseIds.map(id => sql`${id}`), sql`, `);
  const assignments = await db.execute(sql`
    SELECT 'assignment' as kind, a.id, a.title, a.due_at as "dueAt", a.points, a.course_id as "courseId",
           c.title as "courseName", c.code as "courseCode"
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.course_id IN (${idList})
      AND a.is_published = true
      AND a.due_at IS NOT NULL
      AND a.due_at >= ${now.toISOString()}
      AND a.due_at <= ${horizon.toISOString()}
  `);
  const quizzes = await db.execute(sql`
    SELECT 'quiz' as kind, q.id, q.title, q.end_time as "dueAt",
           COALESCE((SELECT sum(points)::int FROM questions WHERE quiz_id = q.id), 0) AS points,
           q.course_id as "courseId",
           c.title as "courseName", c.code as "courseCode"
    FROM quizzes q
    JOIN courses c ON q.course_id = c.id
    WHERE q.course_id IN (${idList})
      AND q.is_published = true
      AND q.end_time IS NOT NULL
      AND q.end_time >= ${now.toISOString()}
      AND q.end_time <= ${horizon.toISOString()}
  `);
  const items = [...(assignments.rows ?? []), ...(quizzes.rows ?? [])]
    .sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  res.json(items);
});

// Student's all grades (across courses) — self only, OR staff/admin viewing a student
router.get("/users/:id/all-grades", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const studentId = parseInt(req.params.id, 10);
  if (!Number.isFinite(studentId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (studentId !== userId) {
    const role = await getRole(userId);
    if (role === "admin") {
      // ok
    } else if (role === "teacher") {
      // Teacher may only view a student enrolled in one of THEIR courses
      const [shared] = await db
        .select({ id: enrollmentsTable.studentId })
        .from(enrollmentsTable)
        .leftJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
        .where(and(eq(enrollmentsTable.studentId, studentId), eq(coursesTable.teacherId, userId)))
        .limit(1);
      if (!shared) { res.status(403).json({ error: "Student is not in any of your courses" }); return; }
    } else {
      res.status(403).json({ error: "Forbidden" }); return;
    }
  }
  const result = await db.execute(sql`
    SELECT 'assignment' as kind, a.id as item_id, a.title, a.points as max_points,
           s.grade, s.graded_at as "gradedAt", s.feedback,
           c.id as "courseId", c.title as "courseName", c.code as "courseCode"
    FROM assignment_submissions s
    JOIN assignments a ON s.assignment_id = a.id
    JOIN courses c ON a.course_id = c.id
    WHERE s.student_id = ${studentId}
    UNION ALL
    SELECT 'quiz' as kind, q.id as item_id, q.title,
           COALESCE((SELECT sum(points)::int FROM questions WHERE quiz_id = q.id), 0) as max_points,
           qa.score as grade, qa.submitted_at as "gradedAt", null as feedback,
           c.id as "courseId", c.title as "courseName", c.code as "courseCode"
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    JOIN courses c ON q.course_id = c.id
    WHERE qa.student_id = ${studentId} AND qa.submitted_at IS NOT NULL
    ORDER BY "gradedAt" DESC NULLS LAST
  `);
  res.json(result.rows ?? []);
});

export default router;
