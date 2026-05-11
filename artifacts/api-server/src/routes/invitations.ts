import { Router, type IRouter } from "express";
import { db, courseInvitationsTable, enrollmentsTable, usersTable, coursesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { sendInvitationEmail } from "../lib/email.js";
import { logger } from "../lib/logger.js";

function inviteLink(req: any, token: string): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  const base = domains ? `https://${domains}` : `${proto}://${host}`;
  return `${base}/invite/${token}`;
}

const router: IRouter = Router();

const getSessionUser = async (req: any) => {
  const userId = req.session?.userId;
  if (!userId) return null;
  const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
    .from(usersTable).where(eq(usersTable.id, userId));
  return user ?? null;
};

const enrich = async (inv: typeof courseInvitationsTable.$inferSelect) => {
  const [course] = await db.select({ title: coursesTable.title, code: coursesTable.code }).from(coursesTable).where(eq(coursesTable.id, inv.courseId));
  const [inviter] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, inv.invitedBy));
  return { ...inv, courseTitle: course?.title ?? null, courseCode: course?.code ?? null, inviterName: inviter?.name ?? null };
};

router.get("/courses/:courseId/invitations", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user || user.role === "student") { res.status(403).json({ error: "Forbidden" }); return; }
  const courseId = parseInt(Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId, 10);
  const invitations = await db.select().from(courseInvitationsTable).where(eq(courseInvitationsTable.courseId, courseId));
  const enriched = await Promise.all(invitations.map(enrich));
  res.json(enriched);
});

router.post("/courses/:courseId/invitations", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user || user.role === "student") { res.status(403).json({ error: "Forbidden" }); return; }
  const courseId = parseInt(Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId, 10);
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "Email is required" }); return; }

  // Check for existing pending invitation
  const [existing] = await db.select().from(courseInvitationsTable)
    .where(and(eq(courseInvitationsTable.courseId, courseId), eq(courseInvitationsTable.email, email.toLowerCase()), eq(courseInvitationsTable.status, "pending")));
  if (existing) { res.status(409).json({ error: "A pending invitation already exists for this email" }); return; }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [inv] = await db.insert(courseInvitationsTable).values({
    courseId, email: email.toLowerCase(), token, invitedBy: user.id, expiresAt,
  }).returning();
  const enriched = await enrich(inv);
  // Send invitation email (best-effort — do not fail the request if email sending fails)
  let emailSent = false;
  let emailError: string | null = null;
  try {
    await sendInvitationEmail({
      to: inv.email,
      link: inviteLink(req, token),
      courseTitle: enriched.courseTitle ?? "your course",
      courseCode: enriched.courseCode ?? "",
      inviterName: enriched.inviterName ?? user.name,
    });
    emailSent = true;
  } catch (err: any) {
    emailError = err?.message ?? String(err);
    logger.error({ err, email: inv.email, courseId }, "Failed to send invitation email");
  }
  res.status(201).json({ ...enriched, emailSent, emailError });
});

router.delete("/invitations/:id", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user || user.role === "student") { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [inv] = await db.update(courseInvitationsTable).set({ status: "cancelled" }).where(eq(courseInvitationsTable.id, id)).returning();
  if (!inv) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrich(inv));
});

// Public – no auth required
router.get("/invitations/:token", async (req, res): Promise<void> => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const [inv] = await db.select().from(courseInvitationsTable).where(eq(courseInvitationsTable.token, token));
  if (!inv) { res.status(404).json({ error: "Invitation not found" }); return; }

  if (inv.status !== "pending") { res.status(410).json({ error: `Invitation is ${inv.status}` }); return; }
  if (new Date() > inv.expiresAt) {
    await db.update(courseInvitationsTable).set({ status: "expired" }).where(eq(courseInvitationsTable.id, inv.id));
    res.status(410).json({ error: "Invitation has expired" }); return;
  }
  res.json(await enrich(inv));
});

// Bulk invite — teacher/admin only
router.post("/courses/:courseId/invitations/bulk", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user || user.role === "student") { res.status(403).json({ error: "Forbidden" }); return; }
  const courseId = parseInt(Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId, 10);
  const { emails } = req.body as { emails: string[] };
  if (!Array.isArray(emails) || emails.length === 0) { res.status(400).json({ error: "emails array required" }); return; }

  const results: Array<{ email: string; success: boolean; error?: string; token?: string; emailSent?: boolean }> = [];

  for (const rawEmail of emails) {
    const email = rawEmail.trim().toLowerCase();
    if (!email) continue;
    try {
      // Skip if already pending
      const [existing] = await db.select({ id: courseInvitationsTable.id }).from(courseInvitationsTable)
        .where(and(eq(courseInvitationsTable.courseId, courseId), eq(courseInvitationsTable.email, email), eq(courseInvitationsTable.status, "pending")));
      if (existing) { results.push({ email, success: false, error: "Already has a pending invitation" }); continue; }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.insert(courseInvitationsTable).values({ courseId, email, token, invitedBy: user.id, expiresAt });
      const [course] = await db.select({ title: coursesTable.title, code: coursesTable.code }).from(coursesTable).where(eq(coursesTable.id, courseId));
      let emailed = false;
      try {
        await sendInvitationEmail({
          to: email,
          link: inviteLink(req, token),
          courseTitle: course?.title ?? "your course",
          courseCode: course?.code ?? "",
          inviterName: user.name,
        });
        emailed = true;
      } catch (err) {
        logger.error({ err, email, courseId }, "Bulk invite email failed");
      }
      results.push({ email, success: true, token, emailSent: emailed });
    } catch (err: any) {
      results.push({ email, success: false, error: err?.message ?? "Unknown error" });
    }
  }

  const succeeded = results.filter(r => r.success).length;
  res.json({ succeeded, failed: results.length - succeeded, results });
});

// Accept invitation — student must be logged in
router.post("/invitations/:token/accept", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user) { res.status(401).json({ error: "You must be signed in to accept an invitation" }); return; }

  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const [inv] = await db.select().from(courseInvitationsTable).where(eq(courseInvitationsTable.token, token));
  if (!inv) { res.status(404).json({ error: "Invitation not found" }); return; }
  if (inv.status !== "pending") { res.status(410).json({ error: `Invitation is ${inv.status}` }); return; }
  if (new Date() > inv.expiresAt) {
    await db.update(courseInvitationsTable).set({ status: "expired" }).where(eq(courseInvitationsTable.id, inv.id));
    res.status(410).json({ error: "Invitation has expired" }); return;
  }
  if (inv.email !== user.email.toLowerCase()) {
    res.status(403).json({ error: `This invitation was sent to ${inv.email}. You are signed in as ${user.email}.` }); return;
  }

  // Check if already enrolled
  const [already] = await db.select().from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.courseId, inv.courseId), eq(enrollmentsTable.studentId, user.id)));
  if (!already) {
    await db.insert(enrollmentsTable).values({ courseId: inv.courseId, studentId: user.id });
  }

  const [updated] = await db.update(courseInvitationsTable)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(courseInvitationsTable.id, inv.id)).returning();
  res.json(await enrich(updated));
});

export default router;
