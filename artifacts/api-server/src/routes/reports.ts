import { Router } from "express";
import { eq, desc, sql, lte, count } from "drizzle-orm";
import {
  db, documentsTable, departmentsTable, usersTable,
  documentWorkflowStepsTable, deadlinesTable, documentAssignmentsTable,
} from "@workspace/db";
import { requireSystemAdmin } from "../middleware/requireAuth";

const router = Router();

// GET /reports/documents — document stats overall
router.get("/reports/documents", async (req, res) => {
  const { from_date, to_date } = req.query as Record<string, string>;

  const allDocs = await db
    .select({
      id: documentsTable.id,
      direction: documentsTable.direction,
      workflow_step: documentsTable.workflow_step,
      current_status: documentsTable.current_status,
      from_dept_id: documentsTable.from_dept_id,
      created_at: documentsTable.created_at,
    })
    .from(documentsTable)
    .orderBy(desc(documentsTable.created_at));

  let docs = allDocs;
  if (from_date) docs = docs.filter(d => new Date(d.created_at) >= new Date(from_date));
  if (to_date) docs = docs.filter(d => new Date(d.created_at) <= new Date(to_date + "T23:59:59Z"));

  const total = docs.length;
  const incoming = docs.filter(d => d.direction === "هاتوو").length;
  const outgoing = docs.filter(d => d.direction === "ڕۆشتوو").length;
  const completed = docs.filter(d => d.workflow_step === "completed").length;
  const rejected = docs.filter(d => d.workflow_step === "rejected").length;
  const pending = docs.filter(d => !["completed", "rejected"].includes(d.workflow_step)).length;

  const byStep: Record<string, number> = {};
  docs.forEach(d => { byStep[d.workflow_step] = (byStep[d.workflow_step] ?? 0) + 1; });

  return res.json({ total, incoming, outgoing, completed, rejected, pending, by_step: byStep });
});

// GET /reports/departments — per-department document counts
router.get("/reports/departments", async (req, res) => {
  const rows = await db
    .select({
      dept_id: departmentsTable.id,
      dept_name: departmentsTable.name,
      total_docs: sql<number>`COUNT(${documentsTable.id})::int`,
      completed: sql<number>`COUNT(CASE WHEN ${documentsTable.workflow_step} = 'completed' THEN 1 END)::int`,
      pending: sql<number>`COUNT(CASE WHEN ${documentsTable.workflow_step} NOT IN ('completed','rejected') THEN 1 END)::int`,
    })
    .from(departmentsTable)
    .leftJoin(documentsTable, eq(documentsTable.from_dept_id, departmentsTable.id))
    .groupBy(departmentsTable.id, departmentsTable.name)
    .orderBy(departmentsTable.name);

  return res.json(rows);
});

// GET /reports/overdue — overdue documents
router.get("/reports/overdue", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const rows = await db
    .select({
      deadline_id: deadlinesTable.id,
      document_id: documentsTable.id,
      document_number: documentsTable.document_number,
      subject: documentsTable.subject,
      workflow_step: documentsTable.workflow_step,
      due_date: deadlinesTable.due_date,
      dept_name: departmentsTable.name,
      creator_name: usersTable.full_name,
    })
    .from(deadlinesTable)
    .innerJoin(documentsTable, eq(deadlinesTable.document_id, documentsTable.id))
    .leftJoin(departmentsTable, eq(documentsTable.from_dept_id, departmentsTable.id))
    .leftJoin(usersTable, eq(documentsTable.creator_id, usersTable.id))
    .where(lte(deadlinesTable.due_date, today));

  // Filter to non-completed
  const overdue = rows.filter(r => !["completed", "rejected"].includes(r.workflow_step));

  return res.json(overdue);
});

// GET /reports/export — CSV of all documents
router.get("/reports/export", async (req, res) => {
  const docs = await db
    .select({
      id: documentsTable.id,
      document_number: documentsTable.document_number,
      document_date: documentsTable.document_date,
      subject: documentsTable.subject,
      direction: documentsTable.direction,
      workflow_step: documentsTable.workflow_step,
      current_status: documentsTable.current_status,
      dept_name: departmentsTable.name,
      creator_name: usersTable.full_name,
      created_at: documentsTable.created_at,
    })
    .from(documentsTable)
    .leftJoin(departmentsTable, eq(documentsTable.from_dept_id, departmentsTable.id))
    .leftJoin(usersTable, eq(documentsTable.creator_id, usersTable.id))
    .orderBy(desc(documentsTable.created_at));

  const header = "id,document_number,document_date,subject,direction,workflow_step,status,department,creator,created_at";
  const csv = [
    header,
    ...docs.map(d =>
      [d.id, d.document_number, d.document_date, `"${d.subject}"`, d.direction, d.workflow_step, d.current_status, d.dept_name ?? "", d.creator_name ?? "", d.created_at].join(",")
    ),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="documents-report-${Date.now()}.csv"`);
  return res.send(csv);
});

export default router;
