import { Router } from "express";
import { eq, lte, and, desc } from "drizzle-orm";
import {
  db, deadlinesTable, documentsTable, usersTable,
} from "@workspace/db";
import { logAudit } from "../lib/audit";
import { sendNotification } from "../lib/notify";

const router = Router();

// GET /deadlines — all deadlines for accessible docs
router.get("/deadlines", async (req, res) => {
  const rows = await db
    .select({
      id: deadlinesTable.id,
      document_id: deadlinesTable.document_id,
      document_number: documentsTable.document_number,
      subject: documentsTable.subject,
      due_date: deadlinesTable.due_date,
      reminder_date: deadlinesTable.reminder_date,
      is_overdue: deadlinesTable.is_overdue,
      notified_at: deadlinesTable.notified_at,
      created_by: deadlinesTable.created_by,
      creator_name: usersTable.full_name,
      created_at: deadlinesTable.created_at,
    })
    .from(deadlinesTable)
    .innerJoin(documentsTable, eq(deadlinesTable.document_id, documentsTable.id))
    .leftJoin(usersTable, eq(deadlinesTable.created_by, usersTable.id))
    .orderBy(desc(deadlinesTable.due_date));

  return res.json(rows);
});

// GET /deadlines/overdue
router.get("/deadlines/overdue", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const rows = await db
    .select({
      id: deadlinesTable.id,
      document_id: deadlinesTable.document_id,
      document_number: documentsTable.document_number,
      subject: documentsTable.subject,
      due_date: deadlinesTable.due_date,
      days_overdue: db.$count(deadlinesTable),
    })
    .from(deadlinesTable)
    .innerJoin(documentsTable, eq(deadlinesTable.document_id, documentsTable.id))
    .where(lte(deadlinesTable.due_date, today));

  return res.json(rows);
});

// POST /deadlines
router.post("/deadlines", async (req, res) => {
  const { document_id, due_date, reminder_date } = req.body as {
    document_id: number; due_date: string; reminder_date?: string;
  };

  if (!document_id || !due_date) return res.status(400).json({ error: "document_id و due_date پێویستن" });

  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, document_id));
  if (!doc) return res.status(404).json({ error: "نوسراوەکە نەدۆزرایەوە" });

  const [dl] = await db.insert(deadlinesTable).values({
    document_id,
    due_date,
    reminder_date: reminder_date ?? null,
    created_by: req.session.userId!,
  }).returning();

  await logAudit(req, "CREATE_DEADLINE", "deadline", dl.id, doc.document_number);
  return res.status(201).json(dl);
});

// PATCH /deadlines/:id
router.patch("/deadlines/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { due_date, reminder_date } = req.body as { due_date?: string; reminder_date?: string };

  const [updated] = await db.update(deadlinesTable)
    .set({
      ...(due_date && { due_date }),
      ...(reminder_date !== undefined && { reminder_date }),
      updated_at: new Date(),
    })
    .where(eq(deadlinesTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "دڵنیابوون نەدۆزرایەوە" });
  return res.json(updated);
});

// DELETE /deadlines/:id
router.delete("/deadlines/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(deadlinesTable).where(eq(deadlinesTable.id, id));
  return res.json({ success: true });
});

export default router;
