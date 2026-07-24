import { pgTable, serial, integer, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";
import { usersTable } from "./users";
import { departmentsTable } from "./departments";

export const caseStatusEnum = pgEnum("case_status", ["open", "closed", "archived"]);

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  case_number: varchar("case_number", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  department_id: integer("department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  created_by: integer("created_by").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  status: caseStatusEnum("status").notNull().default("open"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const caseDocumentsTable = pgTable("case_documents", {
  id: serial("id").primaryKey(),
  case_id: integer("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  document_id: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  added_by: integer("added_by").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  added_at: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertCaseSchema = createInsertSchema(casesTable).omit({ id: true, created_at: true, updated_at: true });
export const insertCaseDocumentSchema = createInsertSchema(caseDocumentsTable).omit({ id: true, added_at: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;
export type CaseDocument = typeof caseDocumentsTable.$inferSelect;
