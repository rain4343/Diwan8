import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, permissionsTable, rolePermissionsTable, rolesTable, userPermissionsTable } from "@workspace/db";
import { requireSystemAdmin } from "../middleware/requireAuth";
import { logAudit } from "../lib/audit";

const router = Router();

// All permission routes require system admin
router.use(requireSystemAdmin);

// GET /permissions
router.get("/permissions", async (_req, res) => {
  const perms = await db.select().from(permissionsTable).orderBy(permissionsTable.module);
  return res.json(perms);
});

// POST /permissions
router.post("/permissions", async (req, res) => {
  const { name, description, module, action } = req.body;
  if (!name || !module || !action) return res.status(400).json({ error: "ناو، مۆدیول و کردار پێویستن" });

  const [p] = await db.insert(permissionsTable).values({ name, description, module, action }).returning();
  await logAudit(req, "CREATE_PERMISSION", "permission", p.id, p.name);
  return res.status(201).json(p);
});

// PATCH /permissions/:id
router.patch("/permissions/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description } = req.body;
  const [p] = await db.update(permissionsTable).set({ ...(name && { name }), ...(description !== undefined && { description }) })
    .where(eq(permissionsTable.id, id)).returning();
  if (!p) return res.status(404).json({ error: "مۆڵەتەکە نەدۆزرایەوە" });
  return res.json(p);
});

// GET /permissions/roles/:roleId
router.get("/permissions/roles/:roleId", async (req, res) => {
  const roleId = Number(req.params.roleId);
  const rows = await db
    .select({ permission: permissionsTable })
    .from(rolePermissionsTable)
    .innerJoin(permissionsTable, eq(rolePermissionsTable.permission_id, permissionsTable.id))
    .where(eq(rolePermissionsTable.role_id, roleId));
  return res.json(rows.map(r => r.permission));
});

// POST /permissions/roles/:roleId/assign
router.post("/permissions/roles/:roleId/assign", async (req, res) => {
  const roleId = Number(req.params.roleId);
  const { permission_ids } = req.body as { permission_ids: number[] };

  if (!Array.isArray(permission_ids)) return res.status(400).json({ error: "permission_ids پێویستە" });

  await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.role_id, roleId));
  if (permission_ids.length > 0) {
    await db.insert(rolePermissionsTable).values(
      permission_ids.map(pid => ({ role_id: roleId, permission_id: pid }))
    );
  }

  await logAudit(req, "ASSIGN_PERMISSIONS", "role", roleId, undefined, undefined, { permission_ids } as any);
  return res.json({ success: true });
});

// GET /permissions/users/:userId — direct permissions assigned to this user
router.get("/permissions/users/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  const rows = await db
    .select({ permission: permissionsTable })
    .from(userPermissionsTable)
    .innerJoin(permissionsTable, eq(userPermissionsTable.permission_id, permissionsTable.id))
    .where(eq(userPermissionsTable.user_id, userId));
  return res.json(rows.map(r => r.permission));
});

// POST /permissions/users/:userId/assign — bulk-replace direct permissions for a user
router.post("/permissions/users/:userId/assign", async (req, res) => {
  const userId = Number(req.params.userId);
  const { permission_ids } = req.body as { permission_ids: number[] };

  if (!Array.isArray(permission_ids)) return res.status(400).json({ error: "permission_ids پێویستە" });

  await db.delete(userPermissionsTable).where(eq(userPermissionsTable.user_id, userId));
  if (permission_ids.length > 0) {
    await db.insert(userPermissionsTable).values(
      permission_ids.map(pid => ({ user_id: userId, permission_id: pid }))
    );
  }

  await logAudit(req, "ASSIGN_USER_PERMISSIONS", "user", userId, undefined, undefined, { permission_ids } as any);
  return res.json({ success: true });
});

export default router;
