import { pgTable, serial, varchar, date, integer, timestamp, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { departmentsTable } from "./departments";

export const LEAVE_TYPES = ["study", "sick", "annual", "maternity", "nursing", "other"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  study:     "خوێندن",
  sick:      "نەخۆشی",
  annual:    "ئاسایی",
  maternity: "منداڵ بوون",
  nursing:   "دایکایەتی",
  other:     "هیتر",
};

export const LEAVE_STATUSES = ["pending", "approved", "rejected"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const leavesTable = pgTable("leaves", {
  id:            serial("id").primaryKey(),
  user_id:       integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  department_id: integer("department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  leave_type:    varchar("leave_type", { length: 20 }).notNull(),
  start_date:    date("start_date").notNull(),
  end_date:      date("end_date").notNull(),
  notes:         text("notes"),
  status:        varchar("status", { length: 20 }).notNull().default("pending"),
  reviewed_by:   integer("reviewed_by").references(() => usersTable.id, { onDelete: "set null" }),
  reviewed_at:   timestamp("reviewed_at", { withTimezone: true }),
  reviewer_note: text("reviewer_note"),
  created_at:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Leave = typeof leavesTable.$inferSelect;
