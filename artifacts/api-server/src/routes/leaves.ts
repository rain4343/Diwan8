import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, leavesTable, usersTable, departmentsTable } from "@workspace/db";

const router = Router();

const VALID_LEAVE_TYPES = ["study", "sick", "annual", "maternity", "nursing", "other"];

// ── GET /leaves ─────────────────────────────────────────────────
router.get("/leaves", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const isAdmin = !!req.session.isSystemAdmin;

    const rows = await db
      .select({
        id:            leavesTable.id,
        leave_type:    leavesTable.leave_type,
        start_date:    leavesTable.start_date,
        end_date:      leavesTable.end_date,
        notes:         leavesTable.notes,
        status:        leavesTable.status,
        reviewer_note: leavesTable.reviewer_note,
        reviewed_at:   leavesTable.reviewed_at,
        created_at:    leavesTable.created_at,
        user_id:       leavesTable.user_id,
        department_id: leavesTable.department_id,
        user_name:     usersTable.full_name,
        dept_name:     departmentsTable.name,
      })
      .from(leavesTable)
      .leftJoin(usersTable, eq(leavesTable.user_id, usersTable.id))
      .leftJoin(departmentsTable, eq(leavesTable.department_id, departmentsTable.id))
      .where(isAdmin ? undefined : eq(leavesTable.user_id, userId))
      .orderBy(desc(leavesTable.created_at));

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ── POST /leaves ─────────────────────────────────────────────────
router.post("/leaves", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { leave_type, start_date, end_date, notes, department_id } = req.body;

    if (!leave_type || !VALID_LEAVE_TYPES.includes(leave_type))
      return res.status(400).json({ error: "جۆری مۆڵەت دروست نییە." });
    if (!start_date || !end_date)
      return res.status(400).json({ error: "بەروار پێویستە." });
    if (leave_type === "other" && !String(notes ?? "").trim())
      return res.status(400).json({ error: "تێبینی پێویستە کاتێک جۆری مۆڵەت «هیتر» دەبژێریت." });

    // Resolve department_id: use provided value, otherwise fetch from user record
    let deptId: number | null = typeof department_id === "number" ? department_id : null;
    if (deptId === null) {
      const [userRow] = await db
        .select({ department_id: usersTable.department_id })
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      deptId = userRow?.department_id ?? null;
    }

    const [row] = await db.insert(leavesTable).values({
      user_id:       userId,
      department_id: deptId,
      leave_type,
      start_date,
      end_date,
      notes:  notes ? String(notes) : null,
      status: "pending",
    }).returning();

    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ── PATCH /leaves/:id/status  (admin only) ──────────────────────
router.patch("/leaves/:id/status", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const isAdmin = !!req.session.isSystemAdmin;

    if (!isAdmin)
      return res.status(403).json({ error: "تەنها بەڕێوەبەر دەتوانێت." });

    const id = Number(req.params.id);
    const { status, reviewer_note } = req.body;

    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ error: "بڕیار دروست نییە." });

    const [row] = await db.update(leavesTable).set({
      status,
      reviewer_note: reviewer_note ? String(reviewer_note) : null,
      reviewed_by:   userId,
      reviewed_at:   new Date(),
    }).where(eq(leavesTable.id, id)).returning();

    if (!row) return res.status(404).json({ error: "نەدۆزرایەوە" });
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// ── DELETE /leaves/:id  (own pending only) ──────────────────────
router.delete("/leaves/:id", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const isAdmin = !!req.session.isSystemAdmin;
    const id = Number(req.params.id);

    const [existing] = await db.select().from(leavesTable).where(eq(leavesTable.id, id));
    if (!existing) return res.status(404).json({ error: "نەدۆزرایەوە" });
    if (!isAdmin && existing.user_id !== userId)
      return res.status(403).json({ error: "مۆڵەتت نییە." });
    if (existing.status !== "pending")
      return res.status(400).json({ error: "تەنها داواکانی چاوەڕوان دەکرێن بسڕدرێنەوە." });

    await db.delete(leavesTable).where(eq(leavesTable.id, id));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
