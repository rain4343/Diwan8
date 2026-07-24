import { pgTable, serial, integer, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { rolesTable } from "./roles";
import { usersTable } from "./users";

export const permissionModuleEnum = pgEnum("permission_module", [
  "documents",
  "users",
  "departments",
  "cases",
  "reports",
  "audit",
  "admin",
]);

export const permissionActionEnum = pgEnum("permission_action", [
  "create",
  "read",
  "update",
  "delete",
  "export",
]);

export const permissionsTable = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  module: permissionModuleEnum("module").notNull(),
  action: permissionActionEnum("action").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rolePermissionsTable = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role_id: integer("role_id").notNull().references(() => rolesTable.id, { onDelete: "cascade" }),
  permission_id: integer("permission_id").notNull().references(() => permissionsTable.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Direct user-level permissions (override / supplement role permissions)
export const userPermissionsTable = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  permission_id: integer("permission_id").notNull().references(() => permissionsTable.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPermissionSchema = createInsertSchema(permissionsTable).omit({ id: true, created_at: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissionsTable).omit({ id: true, created_at: true });
export const insertUserPermissionSchema = createInsertSchema(userPermissionsTable).omit({ id: true, created_at: true });
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissionsTable.$inferSelect;
export type RolePermission = typeof rolePermissionsTable.$inferSelect;
export type UserPermission = typeof userPermissionsTable.$inferSelect;
