import { pgTable, text, serial, timestamp, integer, boolean, pgEnum, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";

export const quizTypeEnum = pgEnum("quiz_type", ["quiz", "exam"]);
export const attemptStatusEnum = pgEnum("attempt_status", ["in_progress", "submitted", "force_submitted", "graded"]);
export const questionTypeEnum = pgEnum("question_type", ["multiple_choice", "true_false", "short_answer", "essay", "file_upload"]);

export const quizzesTable = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  quizType: quizTypeEnum("quiz_type").notNull().default("quiz"),
  isLockdown: boolean("is_lockdown").notNull().default(false),
  lockdownCamera: boolean("lockdown_camera").notNull().default(false),
  lockdownMic: boolean("lockdown_mic").notNull().default(false),
  durationMinutes: integer("duration_minutes"),
  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  maxAttempts: integer("max_attempts").notNull().default(1),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzesTable.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: questionTypeEnum("question_type").notNull().default("multiple_choice"),
  points: integer("points").notNull().default(1),
  position: integer("position").notNull().default(0),
  options: text("options"),
  correctAnswer: text("correct_answer"),
  explanation: text("explanation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuizSchema = createInsertSchema(quizzesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzesTable.$inferSelect;

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
