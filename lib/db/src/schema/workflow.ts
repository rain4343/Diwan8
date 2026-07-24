import { pgTable, serial, integer, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";
import { usersTable } from "./users";
import { departmentsTable } from "./departments";

export const workflowStepEnum = pgEnum("workflow_step", [
  "draft",
  "sent",
  "received",
  "review",
  "assigned",
  "completed",
  "rejected",
]);

export const documentWorkflowStepsTable = pgTable("document_workflow_steps", {
  id: serial("id").primaryKey(),
  document_id: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  step: workflowStepEnum("step").notNull(),
  from_dept_id: integer("from_dept_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  to_dept_id: integer("to_dept_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  assigned_to_user_id: integer("assigned_to_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  notes: text("notes"),
  created_by: integer("created_by").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertWorkflowStepSchema = createInsertSchema(documentWorkflowStepsTable).omit({ id: true, created_at: true });
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;
export type WorkflowStep = typeof documentWorkflowStepsTable.$inferSelect;
