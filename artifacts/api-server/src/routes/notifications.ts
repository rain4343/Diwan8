import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";

const router = Router();

// GET /notifications/mine
router.get("/notifications/mine", async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.user_id, userId))
    .orderBy(desc(notificationsTable.created_at))
    .limit(50);
  return res.json(rows);
});

// GET /notifications/mine/unread-count
router.get("/notifications/mine/unread-count", async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.user_id, userId), eq(notificationsTable.is_read, false)));
  return res.json({ count: rows.length });
});

// PATCH /notifications/:id/read
router.patch("/notifications/:id/read", async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.session.userId!;

  await db.update(notificationsTable)
    .set({ is_read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.user_id, userId)));

  return res.json({ success: true });
});

// POST /notifications/mark-all-read
router.post("/notifications/mark-all-read", async (req, res) => {
  const userId = req.session.userId!;

  await db.update(notificationsTable)
    .set({ is_read: true })
    .where(and(eq(notificationsTable.user_id, userId), eq(notificationsTable.is_read, false)));

  return res.json({ success: true });
});

export default router;
