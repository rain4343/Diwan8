import { pgTable, serial, integer, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(), // e.g. CREATE_DOCUMENT, UPDATE_STATUS, DELETE_USER
  entity_type: varchar("entity_type", { length: 50 }).notNull(), // e.g. "document", "user", "case"
  entity_id: integer("entity_id"),
  entity_label: varchar("entity_label", { length: 255 }), // human-readable identifier
  old_value: jsonb("old_value").$type<Record<string, unknown>>(),
  new_value: jsonb("new_value").$type<Record<string, unknown>>(),
  ip_address: varchar("ip_address", { length: 45 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true, created_at: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;
