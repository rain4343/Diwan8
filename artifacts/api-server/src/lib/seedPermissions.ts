import { db, permissionsTable } from "@workspace/db";

// All module × action combos the system understands.
// name = "module.action" — used as the unique key on the frontend too.
const ALL_PERMISSIONS: {
  name: string;
  module: "documents" | "users" | "departments" | "cases" | "reports" | "audit";
  action: "create" | "read" | "update" | "delete" | "export";
  description: string;
}[] = [
  // ── documents ──────────────────────────────────────────────────
  { name: "documents.read",   module: "documents",   action: "read",   description: "بینینی نوسراوەکان" },
  { name: "documents.create", module: "documents",   action: "create", description: "دروستکردنی نوسراو" },
  { name: "documents.update", module: "documents",   action: "update", description: "دەستکاریکردنی نوسراو" },
  { name: "documents.delete", module: "documents",   action: "delete", description: "سڕینەوەی نوسراو" },
  { name: "documents.export", module: "documents",   action: "export", description: "هەناردەکردنی نوسراو" },
  // ── users ──────────────────────────────────────────────────────
  { name: "users.read",       module: "users",       action: "read",   description: "بینینی فەرمانبەران" },
  { name: "users.create",     module: "users",       action: "create", description: "دروستکردنی فەرمانبەر" },
  { name: "users.update",     module: "users",       action: "update", description: "دەستکاریکردنی فەرمانبەر" },
  { name: "users.delete",     module: "users",       action: "delete", description: "سڕینەوەی فەرمانبەر" },
  // ── departments ────────────────────────────────────────────────
  { name: "departments.read",   module: "departments", action: "read",   description: "بینینی هۆبەکان" },
  { name: "departments.create", module: "departments", action: "create", description: "دروستکردنی هۆبە" },
  { name: "departments.update", module: "departments", action: "update", description: "دەستکاریکردنی هۆبە" },
  { name: "departments.delete", module: "departments", action: "delete", description: "سڕینەوەی هۆبە" },
  // ── cases (leave requests) ─────────────────────────────────────
  { name: "cases.read",   module: "cases", action: "read",   description: "بینینی مۆڵەتەکان" },
  { name: "cases.create", module: "cases", action: "create", description: "داوا کردنی مۆڵەت" },
  { name: "cases.update", module: "cases", action: "update", description: "دەستکاریکردنی مۆڵەت" },
  { name: "cases.delete", module: "cases", action: "delete", description: "سڕینەوەی مۆڵەت" },
  // ── reports ────────────────────────────────────────────────────
  { name: "reports.read",   module: "reports", action: "read",   description: "بینینی ڕاپۆرتەکان" },
  { name: "reports.export", module: "reports", action: "export", description: "هەناردەکردنی ڕاپۆرت" },
  // ── audit ──────────────────────────────────────────────────────
  { name: "audit.read", module: "audit", action: "read", description: "بینینی تۆماری گۆڕانکاری" },
];

export async function seedPermissions() {
  for (const perm of ALL_PERMISSIONS) {
    await db.insert(permissionsTable).values(perm).onConflictDoNothing();
  }
}
