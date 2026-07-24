import { pgTable, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";
import { usersTable } from "./users";

export const deadlinesTable = pgTable("deadlines", {
  id: serial("id").primaryKey(),
  document_id: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  due_date: date("due_date").notNull(),
  reminder_date: date("reminder_date"),
  is_overdue: boolean("is_overdue").notNull().default(false),
  notified_at: timestamp("notified_at", { withTimezone: true }),
  created_by: integer("created_by").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertDeadlineSchema = createInsertSchema(deadlinesTable).omit({ id: true, is_overdue: true, notified_at: true, created_at: true, updated_at: true });
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;
export type Deadline = typeof deadlinesTable.$inferSelect;
