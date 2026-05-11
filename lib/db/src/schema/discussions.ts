import { pgTable, text, serial, timestamp, integer, boolean, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { usersTable } from "./users";

export const discussionsTable = pgTable("discussions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  isPinned: boolean("is_pinned").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const discussionRepliesTable = pgTable("discussion_replies", {
  id: serial("id").primaryKey(),
  discussionId: integer("discussion_id").notNull().references(() => discussionsTable.id, { onDelete: "cascade" }),
  parentReplyId: integer("parent_reply_id").references((): AnyPgColumn => discussionRepliesTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDiscussionSchema = createInsertSchema(discussionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;
export type Discussion = typeof discussionsTable.$inferSelect;

export const insertDiscussionReplySchema = createInsertSchema(discussionRepliesTable).omit({ id: true, createdAt: true });
export type InsertDiscussionReply = z.infer<typeof insertDiscussionReplySchema>;
export type DiscussionReply = typeof discussionRepliesTable.$inferSelect;
