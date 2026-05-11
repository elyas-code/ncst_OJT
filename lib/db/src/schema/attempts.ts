import { pgTable, serial, timestamp, integer, boolean, text, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { quizzesTable, attemptStatusEnum } from "./quizzes";
import { usersTable } from "./users";

export const attemptsTable = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzesTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: attemptStatusEnum("status").notNull().default("in_progress"),
  score: real("score"),
  maxScore: real("max_score"),
  answers: text("answers"),
  feedback: text("feedback"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  lateEntry: boolean("late_entry").notNull().default(false),
  lateMinutes: integer("late_minutes"),
  lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }),
});

export const insertAttemptSchema = createInsertSchema(attemptsTable).omit({ id: true, startedAt: true });
export type InsertAttempt = z.infer<typeof insertAttemptSchema>;
export type Attempt = typeof attemptsTable.$inferSelect;
