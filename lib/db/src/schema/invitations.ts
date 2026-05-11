import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { coursesTable } from "./courses";

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "cancelled",
  "expired",
]);

export const courseInvitationsTable = pgTable("course_invitations", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  status: invitationStatusEnum("status").notNull().default("pending"),
  invitedBy: integer("invited_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

export const insertInvitationSchema = createInsertSchema(courseInvitationsTable).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  status: true,
});
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type CourseInvitation = typeof courseInvitationsTable.$inferSelect;
