import { pgTable, serial, integer, varchar, text, timestamp, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";
import { usersTable } from "./users";
import { departmentsTable } from "./departments";

export const assignmentPriorityEnum = pgEnum("assignment_priority", ["low", "normal", "high", "urgent"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["open", "in_progress", "done", "cancelled"]);

export const documentAssignmentsTable = pgTable("document_assignments", {
  id: serial("id").primaryKey(),
  document_id: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  assigned_to: integer("assigned_to").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  assigned_by: integer("assigned_by").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  department_id: integer("department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  due_date: date("due_date"),
  priority: assignmentPriorityEnum("priority").notNull().default("normal"),
  status: assignmentStatusEnum("status").notNull().default("open"),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAssignmentSchema = createInsertSchema(documentAssignmentsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof documentAssignmentsTable.$inferSelect;
