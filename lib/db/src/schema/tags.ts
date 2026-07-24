import { pgTable, serial, integer, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";
import { usersTable } from "./users";
import { departmentsTable } from "./departments";

// Document Tags
export const documentTagsTable = pgTable("document_tags", {
  id: serial("id").primaryKey(),
  document_id: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  tag: varchar("tag", { length: 100 }).notNull(),
  created_by: integer("created_by").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Document Comments
export const documentCommentsTable = pgTable("document_comments", {
  id: serial("id").primaryKey(),
  document_id: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  user_id: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parent_id: integer("parent_id"), // self-ref for threads — defined without FK to avoid circular
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Reports Config
export const reportTypeEnum = pgEnum("report_type", ["documents", "departments", "overdue", "audit"]);

export const reportsConfigTable = pgTable("reports_config", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: reportTypeEnum("type").notNull(),
  filters: text("filters"), // JSON string of filter params
  created_by: integer("created_by").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  schedule: varchar("schedule", { length: 50 }), // cron expression or null
  last_run_at: timestamp("last_run_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertDocumentTagSchema = createInsertSchema(documentTagsTable).omit({ id: true, created_at: true });
export const insertDocumentCommentSchema = createInsertSchema(documentCommentsTable).omit({ id: true, created_at: true, updated_at: true });
export const insertReportConfigSchema = createInsertSchema(reportsConfigTable).omit({ id: true, last_run_at: true, created_at: true, updated_at: true });

export type InsertDocumentTag = z.infer<typeof insertDocumentTagSchema>;
export type InsertDocumentComment = z.infer<typeof insertDocumentCommentSchema>;
export type InsertReportConfig = z.infer<typeof insertReportConfigSchema>;
export type DocumentTag = typeof documentTagsTable.$inferSelect;
export type DocumentComment = typeof documentCommentsTable.$inferSelect;
export type ReportConfig = typeof reportsConfigTable.$inferSelect;
