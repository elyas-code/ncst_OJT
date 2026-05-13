import nodemailer from "nodemailer";
import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// Shared SMTP transporter (Office 365 / Outlook)
// ---------------------------------------------------------------------------

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: false, // STARTTLS on port 587
    auth: { user, pass },
    tls: { ciphers: "SSLv3" },
  });
}

const FROM = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@ncst.edu.bh";

// ---------------------------------------------------------------------------
// Invitation email
// ---------------------------------------------------------------------------

type InvitationEmail = {
  to: string;
  link: string;
  courseTitle: string;
  courseCode: string;
  inviterName: string;
};

export async function sendInvitationEmail(opts: InvitationEmail): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    logger.info(
      { to: opts.to, course: opts.courseTitle },
      "[email-stub] SMTP not configured — would send invitation email",
    );
    return;
  }

  const subject = `You've been invited to ${opts.courseTitle} on NCST Portal`;

  const text = `Hello,

${opts.inviterName} has invited you to join the course "${opts.courseTitle}"${opts.courseCode ? ` (${opts.courseCode})` : ""} on the NCST Campus Portal.

Accept your invitation here:
${opts.link}

This link expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.

— NCST Campus Portal`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="padding:24px 28px;background:#0f172a;color:#fff">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7">NCST Campus Portal</div>
      <h1 style="margin:6px 0 0;font-size:20px;font-weight:600">You've been invited to a course</h1>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55">
        <strong>${escapeHtml(opts.inviterName)}</strong> has invited you to join
        <strong>${escapeHtml(opts.courseTitle)}</strong>${opts.courseCode ? ` <span style="color:#64748b;font-family:monospace;font-size:13px">(${escapeHtml(opts.courseCode)})</span>` : ""}
        on the NCST Campus Portal.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.55">
        Click the button below to accept and access your course materials.
      </p>
      <div style="text-align:center;margin:0 0 24px">
        <a href="${opts.link}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
          Accept invitation
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">
        Or paste this link into your browser:<br>
        <a href="${opts.link}" style="color:#475569;word-break:break-all">${opts.link}</a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="margin:0;font-size:12px;color:#94a3b8">
        This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
      </p>
    </div>
  </div>
</body></html>`;

  await transporter.sendMail({ from: FROM, to: opts.to, subject, text, html });
  logger.info({ to: opts.to, course: opts.courseTitle }, "Invitation email sent");
}

// ---------------------------------------------------------------------------
// Submission decision email (reject / revision requested)
// ---------------------------------------------------------------------------

type SubmissionDecisionEmail = {
  to: string;
  studentName: string;
  courseTitle: string;
  slotTitle: string;
  decision: "rejected" | "revision_requested";
  reviewerName: string;
  reviewComment?: string | null;
};

export async function sendSubmissionDecisionEmail(opts: SubmissionDecisionEmail): Promise<void> {
  const transporter = createTransporter();

  const verb = opts.decision === "rejected" ? "Rejected" : "Revision Requested";
  const verbUpper = verb.toUpperCase();

  if (!transporter) {
    logger.info(
      {
        to: opts.to,
        student: opts.studentName,
        course: opts.courseTitle,
        slot: opts.slotTitle,
        decision: opts.decision,
        reviewer: opts.reviewerName,
        comment: opts.reviewComment ?? null,
      },
      `[email-stub] SMTP not configured — would email ${opts.to}: submission ${verbUpper} for "${opts.slotTitle}" in ${opts.courseTitle}`,
    );
    return;
  }

  const subject = `Your submission for "${opts.slotTitle}" has been ${verb} — ${opts.courseTitle}`;

  const commentBlock = opts.reviewComment
    ? `\nReviewer comment:\n${opts.reviewComment}\n`
    : "";

  const text = `Hello ${opts.studentName},

Your submission for the slot "${opts.slotTitle}" in the course "${opts.courseTitle}" has been ${verb.toLowerCase()}.
${commentBlock}
Please log in to the NCST Campus Portal to view the details and resubmit if applicable.

— NCST Campus Portal`;

  const accentColor = opts.decision === "rejected" ? "#dc2626" : "#d97706";
  const commentHtml = opts.reviewComment
    ? `<div style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid #cbd5e1;border-radius:4px">
        <p style="margin:0;font-size:13px;color:#475569;font-style:italic">${escapeHtml(opts.reviewComment)}</p>
       </div>`
    : "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="padding:24px 28px;background:#0f172a;color:#fff">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.7">NCST Campus Portal</div>
      <h1 style="margin:6px 0 0;font-size:20px;font-weight:600">Submission Update</h1>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 8px;font-size:15px;line-height:1.55">Hello <strong>${escapeHtml(opts.studentName)}</strong>,</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55">
        Your submission for <strong>${escapeHtml(opts.slotTitle)}</strong> in
        <strong>${escapeHtml(opts.courseTitle)}</strong> has been:
      </p>
      <div style="display:inline-block;padding:6px 14px;background:${accentColor};color:#fff;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:16px">
        ${escapeHtml(verb)}
      </div>
      ${commentHtml}
      <p style="margin:16px 0 0;font-size:13px;color:#64748b">
        Reviewed by <strong>${escapeHtml(opts.reviewerName)}</strong>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="margin:0;font-size:12px;color:#94a3b8">
        Log in to the NCST Campus Portal to view your submission and resubmit if applicable.
      </p>
    </div>
  </div>
</body></html>`;

  await transporter.sendMail({ from: FROM, to: opts.to, subject, text, html });
  logger.info({ to: opts.to, student: opts.studentName, decision: opts.decision }, "Submission decision email sent");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
