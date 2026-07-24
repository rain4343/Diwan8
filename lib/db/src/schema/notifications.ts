import { pgTable, serial, integer, varchar, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // e.g. "new_assignment", "status_change", "deadline"
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>(),
  is_read: boolean("is_read").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, is_read: true, created_at: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
