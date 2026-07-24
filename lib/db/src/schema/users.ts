import { pgTable, serial, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { departmentsTable } from "./departments";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  full_name: varchar("full_name", { length: 150 }).notNull(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  department_id: integer("department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  phone: varchar("phone", { length: 30 }),
  avatar_image: varchar("avatar_image", { length: 500 }),
  remember_token: varchar("remember_token", { length: 100 }),
  signature_image: varchar("signature_image", { length: 500 }),
  is_system_admin: boolean("is_system_admin").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, remember_token: true, is_system_admin: true, created_at: true, updated_at: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
