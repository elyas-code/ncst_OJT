import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { usersTable } from "./users";

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  points: integer("points").notNull().default(100),
  allowFile: boolean("allow_file").notNull().default(true),
  allowText: boolean("allow_text").notNull().default(true),
  isPublished: boolean("is_published").notNull().default(true),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const assignmentSubmissionsTable = pgTable("assignment_submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => assignmentsTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  grade: integer("grade"),
  feedback: text("feedback"),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
  gradedBy: integer("graded_by").references(() => usersTable.id),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;

export const insertAssignmentSubmissionSchema = createInsertSchema(assignmentSubmissionsTable).omit({ id: true, submittedAt: true });
export type InsertAssignmentSubmission = z.infer<typeof insertAssignmentSubmissionSchema>;
export type AssignmentSubmission = typeof assignmentSubmissionsTable.$inferSelect;
