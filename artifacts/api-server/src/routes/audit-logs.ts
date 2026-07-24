import { Router } from "express";
import { eq, desc, and, gte, lte, ilike } from "drizzle-orm";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { requireSystemAdmin } from "../middleware/requireAuth";

const router = Router();

// GET /audit-logs — system admin only
router.get("/audit-logs", requireSystemAdmin, async (req, res) => {
  const { user_id, entity_type, action, from_date, to_date, page = "1", limit = "50" } =
    req.query as Record<string, string>;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Math.max(1, Number(limit)));
  const offset = (pageNum - 1) * limitNum;

  let rows = await db
    .select({
      id: auditLogsTable.id,
      user_id: auditLogsTable.user_id,
      username: usersTable.username,
      full_name: usersTable.full_name,
      action: auditLogsTable.action,
      entity_type: auditLogsTable.entity_type,
      entity_id: auditLogsTable.entity_id,
      entity_label: auditLogsTable.entity_label,
      old_value: auditLogsTable.old_value,
      new_value: auditLogsTable.new_value,
      ip_address: auditLogsTable.ip_address,
      created_at: auditLogsTable.created_at,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.user_id, usersTable.id))
    .orderBy(desc(auditLogsTable.created_at))
    .limit(limitNum)
    .offset(offset);

  if (user_id) rows = rows.filter(r => r.user_id === Number(user_id));
  if (entity_type) rows = rows.filter(r => r.entity_type === entity_type);
  if (action) rows = rows.filter(r => r.action.includes(action.toUpperCase()));
  if (from_date) rows = rows.filter(r => new Date(r.created_at) >= new Date(from_date));
  if (to_date) rows = rows.filter(r => new Date(r.created_at) <= new Date(to_date + "T23:59:59Z"));

  return res.json({ data: rows, page: pageNum, limit: limitNum });
});

// GET /audit-logs/export — CSV
router.get("/audit-logs/export", requireSystemAdmin, async (req, res) => {
  const rows = await db
    .select({
      id: auditLogsTable.id,
      username: usersTable.username,
      action: auditLogsTable.action,
      entity_type: auditLogsTable.entity_type,
      entity_id: auditLogsTable.entity_id,
      entity_label: auditLogsTable.entity_label,
      ip_address: auditLogsTable.ip_address,
      created_at: auditLogsTable.created_at,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.user_id, usersTable.id))
    .orderBy(desc(auditLogsTable.created_at))
    .limit(10000);

  const header = "id,username,action,entity_type,entity_id,entity_label,ip_address,created_at";
  const csv = [
    header,
    ...rows.map(r =>
      [r.id, r.username ?? "", r.action, r.entity_type, r.entity_id ?? "", r.entity_label ?? "", r.ip_address ?? "", r.created_at].join(",")
    ),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="audit-log-${Date.now()}.csv"`);
  return res.send(csv);
});

export default router;
