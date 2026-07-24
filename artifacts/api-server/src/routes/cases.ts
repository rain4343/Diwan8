import { Router } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  db, casesTable, caseDocumentsTable, documentsTable,
  usersTable, departmentsTable,
} from "@workspace/db";
import { logAudit } from "../lib/audit";

const router = Router();

// GET /cases
router.get("/cases", async (req, res) => {
  const { dept_id, status, search } = req.query as Record<string, string>;

  let rows = await db
    .select({
      id: casesTable.id,
      case_number: casesTable.case_number,
      title: casesTable.title,
      description: casesTable.description,
      status: casesTable.status,
      department_id: casesTable.department_id,
      department_name: departmentsTable.name,
      created_by: casesTable.created_by,
      creator_name: usersTable.full_name,
      created_at: casesTable.created_at,
      updated_at: casesTable.updated_at,
      doc_count: sql<number>`(SELECT COUNT(*) FROM case_documents WHERE case_id = ${casesTable.id})::int`,
    })
    .from(casesTable)
    .leftJoin(departmentsTable, eq(casesTable.department_id, departmentsTable.id))
    .leftJoin(usersTable, eq(casesTable.created_by, usersTable.id))
    .orderBy(desc(casesTable.created_at));

  if (dept_id) rows = rows.filter(r => r.department_id === Number(dept_id));
  if (status) rows = rows.filter(r => r.status === status);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(r => r.title.toLowerCase().includes(q) || r.case_number.toLowerCase().includes(q));
  }

  return res.json(rows);
});

// GET /cases/:id
router.get("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [c] = await db
    .select({
      id: casesTable.id,
      case_number: casesTable.case_number,
      title: casesTable.title,
      description: casesTable.description,
      status: casesTable.status,
      department_id: casesTable.department_id,
      department_name: departmentsTable.name,
      created_by: casesTable.created_by,
      creator_name: usersTable.full_name,
      created_at: casesTable.created_at,
      updated_at: casesTable.updated_at,
    })
    .from(casesTable)
    .leftJoin(departmentsTable, eq(casesTable.department_id, departmentsTable.id))
    .leftJoin(usersTable, eq(casesTable.created_by, usersTable.id))
    .where(eq(casesTable.id, id));

  if (!c) return res.status(404).json({ error: "پرونده نەدۆزرایەوە" });

  // Get associated documents
  const docs = await db
    .select({
      id: documentsTable.id,
      document_number: documentsTable.document_number,
      subject: documentsTable.subject,
      current_status: documentsTable.current_status,
      workflow_step: documentsTable.workflow_step,
      direction: documentsTable.direction,
      document_date: documentsTable.document_date,
      added_at: caseDocumentsTable.added_at,
      added_by: caseDocumentsTable.added_by,
    })
    .from(caseDocumentsTable)
    .innerJoin(documentsTable, eq(caseDocumentsTable.document_id, documentsTable.id))
    .where(eq(caseDocumentsTable.case_id, id))
    .orderBy(desc(caseDocumentsTable.added_at));

  return res.json({ ...c, documents: docs });
});

// POST /cases
router.post("/cases", async (req, res) => {
  const { case_number, title, description, department_id } = req.body as {
    case_number: string; title: string; description?: string; department_id?: number;
  };

  if (!case_number?.trim() || !title?.trim()) {
    return res.status(400).json({ error: "ژمارەی پرونده و ناونیشان پێویستن" });
  }

  const [c] = await db.insert(casesTable).values({
    case_number: case_number.trim(),
    title: title.trim(),
    description: description?.trim() ?? null,
    department_id: department_id ?? null,
    created_by: req.session.userId!,
    status: "open",
  }).returning();

  await logAudit(req, "CREATE_CASE", "case", c.id, c.case_number);
  return res.status(201).json(c);
});

// PATCH /cases/:id
router.patch("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, department_id, status } = req.body as {
    title?: string; description?: string; department_id?: number; status?: string;
  };

  const [old] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!old) return res.status(404).json({ error: "پرونده نەدۆزرایەوە" });

  const [updated] = await db.update(casesTable)
    .set({
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(department_id !== undefined && { department_id }),
      ...(status && { status: status as any }),
      updated_at: new Date(),
    })
    .where(eq(casesTable.id, id))
    .returning();

  await logAudit(req, "UPDATE_CASE", "case", id, old.case_number, old as any, updated as any);
  return res.json(updated);
});

// DELETE /cases/:id
router.delete("/cases/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [c] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!c) return res.status(404).json({ error: "پرونده نەدۆزرایەوە" });

  await db.delete(casesTable).where(eq(casesTable.id, id));
  await logAudit(req, "DELETE_CASE", "case", id, c.case_number);
  return res.json({ success: true });
});

// POST /cases/:id/documents
router.post("/cases/:id/documents", async (req, res) => {
  const caseId = Number(req.params.id);
  const { document_id } = req.body as { document_id: number };

  if (!document_id) return res.status(400).json({ error: "document_id پێویستە" });

  const [c] = await db.select().from(casesTable).where(eq(casesTable.id, caseId));
  if (!c) return res.status(404).json({ error: "پرونده نەدۆزرایەوە" });

  // avoid duplicate
  const [existing] = await db.select().from(caseDocumentsTable)
    .where(and(eq(caseDocumentsTable.case_id, caseId), eq(caseDocumentsTable.document_id, document_id)));
  if (existing) return res.status(409).json({ error: "نوسراوەکە پێشتر زیادکراوە" });

  await db.insert(caseDocumentsTable).values({
    case_id: caseId,
    document_id,
    added_by: req.session.userId!,
  });

  return res.status(201).json({ success: true });
});

// DELETE /cases/:id/documents/:docId
router.delete("/cases/:id/documents/:docId", async (req, res) => {
  const caseId = Number(req.params.id);
  const docId = Number(req.params.docId);

  await db.delete(caseDocumentsTable)
    .where(and(eq(caseDocumentsTable.case_id, caseId), eq(caseDocumentsTable.document_id, docId)));

  return res.json({ success: true });
});

export default router;
