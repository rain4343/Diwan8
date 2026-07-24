import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  db, documentsTable, documentWorkflowStepsTable,
  usersTable, departmentsTable, notificationsTable,
  documentAssignmentsTable,
} from "@workspace/db";
import { requireAuth } from "../middleware/requireAuth";
import { logAudit } from "../lib/audit";
import { sendNotification } from "../lib/notify";

const router = Router();

const STEP_LABELS: Record<string, string> = {
  draft: "پێشنووس",
  sent: "نێردراو",
  received: "وەرگیراو",
  review: "لە پێداچوونەوەدایە",
  assigned: "سپاردراو",
  completed: "تەواوبوو",
  rejected: "ڕەتکراوە",
};

// GET /workflow/:docId/timeline
router.get("/workflow/:docId/timeline", async (req, res) => {
  const docId = Number(req.params.docId);
  if (isNaN(docId)) return res.status(400).json({ error: "ناسنامەی نادروست" });

  const steps = await db
    .select({
      id: documentWorkflowStepsTable.id,
      step: documentWorkflowStepsTable.step,
      from_dept_id: documentWorkflowStepsTable.from_dept_id,
      to_dept_id: documentWorkflowStepsTable.to_dept_id,
      assigned_to_user_id: documentWorkflowStepsTable.assigned_to_user_id,
      notes: documentWorkflowStepsTable.notes,
      created_by: documentWorkflowStepsTable.created_by,
      created_at: documentWorkflowStepsTable.created_at,
      creator_name: usersTable.full_name,
      creator_username: usersTable.username,
      from_dept_name: db.$with("fd").as(
        db.select({ name: departmentsTable.name })
          .from(departmentsTable)
          .where(eq(departmentsTable.id, documentWorkflowStepsTable.from_dept_id!))
      ),
    })
    .from(documentWorkflowStepsTable)
    .leftJoin(usersTable, eq(documentWorkflowStepsTable.created_by, usersTable.id))
    .where(eq(documentWorkflowStepsTable.document_id, docId))
    .orderBy(documentWorkflowStepsTable.created_at);

  // Enrich with dept names
  const deptIds = new Set<number>();
  steps.forEach(s => {
    if (s.from_dept_id) deptIds.add(s.from_dept_id);
    if (s.to_dept_id) deptIds.add(s.to_dept_id);
  });

  let deptMap: Record<number, string> = {};
  if (deptIds.size > 0) {
    const depts = await db.select({ id: departmentsTable.id, name: departmentsTable.name })
      .from(departmentsTable);
    depts.forEach(d => { deptMap[d.id] = d.name; });
  }

  return res.json(steps.map(s => ({
    ...s,
    step_label: STEP_LABELS[s.step] ?? s.step,
    from_dept_name: s.from_dept_id ? deptMap[s.from_dept_id] : null,
    to_dept_name: s.to_dept_id ? deptMap[s.to_dept_id] : null,
  })));
});

// POST /workflow/:docId/advance
// Body: { step, to_dept_id?, assigned_to_user_id?, notes? }
router.post("/workflow/:docId/advance", async (req, res) => {
  const docId = Number(req.params.docId);
  if (isNaN(docId)) return res.status(400).json({ error: "ناسنامەی نادروست" });

  const { step, to_dept_id, assigned_to_user_id, notes } = req.body as {
    step: string;
    to_dept_id?: number;
    assigned_to_user_id?: number;
    notes?: string;
  };

  const validSteps = ["draft", "sent", "received", "review", "assigned", "completed", "rejected"];
  if (!step || !validSteps.includes(step)) {
    return res.status(400).json({ error: "مەرحەلەی نادروست" });
  }

  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, docId));
  if (!doc) return res.status(404).json({ error: "نوسراوەکە نەدۆزرایەوە" });

  const oldStep = doc.workflow_step;

  // Record workflow step
  await db.insert(documentWorkflowStepsTable).values({
    document_id: docId,
    step: step as any,
    from_dept_id: doc.from_dept_id ?? null,
    to_dept_id: to_dept_id ?? doc.to_dept_id ?? null,
    assigned_to_user_id: assigned_to_user_id ?? null,
    notes: notes ?? null,
    created_by: req.session.userId!,
  });

  // Map step → Kurdish status label
  const stepToStatus: Record<string, string> = {
    draft: "پێشنووس",
    sent: "نێردراو",
    received: "وەرگیراو",
    review: "لە پێداچوونەوەدایە",
    assigned: "سپاردراو",
    completed: "تەواوبوو",
    rejected: "ڕەتکراوەتەوە",
  };

  await db.update(documentsTable)
    .set({
      workflow_step: step,
      current_status: stepToStatus[step] ?? step,
      to_dept_id: to_dept_id ?? doc.to_dept_id,
      updated_at: new Date(),
    })
    .where(eq(documentsTable.id, docId));

  // Create assignment if assigned_to_user_id provided
  if (step === "assigned" && assigned_to_user_id) {
    await db.insert(documentAssignmentsTable).values({
      document_id: docId,
      assigned_to: assigned_to_user_id,
      assigned_by: req.session.userId!,
      priority: "normal",
      status: "open",
    });

    // Notify assigned user
    await sendNotification(
      assigned_to_user_id,
      "new_assignment",
      "نوسراوێکت پێ سپێردراوە",
      `نوسراوی ${doc.document_number}: ${doc.subject} پێت سپێردراوە`,
      { document_id: docId, document_number: doc.document_number },
    );
  }

  // Notify to_dept users if step is "sent"
  if (step === "sent" && to_dept_id) {
    const deptUsers = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.department_id, to_dept_id));
    for (const u of deptUsers) {
      await sendNotification(
        u.id,
        "document_sent",
        "نوسراوی نوێ بۆ هۆبەکەت هاتووە",
        `نوسراوی ${doc.document_number}: ${doc.subject} بۆ هۆبەکەت نێردراوە`,
        { document_id: docId, document_number: doc.document_number },
      );
    }
  }

  await logAudit(req, "WORKFLOW_ADVANCE", "document", docId, doc.document_number, { step: oldStep }, { step });

  return res.json({ success: true, step, status: stepToStatus[step] ?? step });
});

export default router;
