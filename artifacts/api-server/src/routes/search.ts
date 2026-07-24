import { Router } from "express";
import { ilike, or, eq, and, desc } from "drizzle-orm";
import {
  db, documentsTable, usersTable, departmentsTable,
  casesTable, documentTagsTable,
} from "@workspace/db";

const router = Router();

// GET /search?q=&type=documents|cases|users&dept_id=&status=&from_date=&to_date=
router.get("/search", async (req, res) => {
  const { q = "", type, dept_id, status, from_date, to_date, direction } =
    req.query as Record<string, string>;

  const query = q.trim();
  const results: {
    type: string;
    id: number;
    title: string;
    subtitle: string;
    status?: string;
    date?: string;
    dept?: string;
    href: string;
  }[] = [];

  if (!type || type === "documents") {
    let docs = await db
      .select({
        id: documentsTable.id,
        document_number: documentsTable.document_number,
        subject: documentsTable.subject,
        current_status: documentsTable.current_status,
        workflow_step: documentsTable.workflow_step,
        direction: documentsTable.direction,
        document_date: documentsTable.document_date,
        dept_name: departmentsTable.name,
        creator_name: usersTable.full_name,
        created_at: documentsTable.created_at,
      })
      .from(documentsTable)
      .leftJoin(departmentsTable, eq(documentsTable.from_dept_id, departmentsTable.id))
      .leftJoin(usersTable, eq(documentsTable.creator_id, usersTable.id))
      .orderBy(desc(documentsTable.created_at))
      .limit(200);

    if (query) {
      const q2 = query.toLowerCase();
      docs = docs.filter(d =>
        d.document_number.toLowerCase().includes(q2) ||
        d.subject.toLowerCase().includes(q2) ||
        (d.creator_name ?? "").toLowerCase().includes(q2)
      );
    }
    if (dept_id) docs = docs.filter(d => String(d.dept_name) === dept_id || String(d.id) === dept_id);
    if (status) docs = docs.filter(d => d.workflow_step === status || d.current_status === status);
    if (direction) docs = docs.filter(d => d.direction === direction);
    if (from_date) docs = docs.filter(d => d.document_date >= from_date);
    if (to_date) docs = docs.filter(d => d.document_date <= to_date);

    docs.slice(0, 50).forEach(d => {
      results.push({
        type: "document",
        id: d.id,
        title: d.document_number,
        subtitle: d.subject,
        status: d.current_status,
        date: d.document_date,
        dept: d.dept_name ?? undefined,
        href: `/documents/${d.id}`,
      });
    });
  }

  if (!type || type === "cases") {
    let cases = await db
      .select({
        id: casesTable.id,
        case_number: casesTable.case_number,
        title: casesTable.title,
        status: casesTable.status,
        dept_name: departmentsTable.name,
        created_at: casesTable.created_at,
      })
      .from(casesTable)
      .leftJoin(departmentsTable, eq(casesTable.department_id, departmentsTable.id))
      .orderBy(desc(casesTable.created_at))
      .limit(100);

    if (query) {
      const q2 = query.toLowerCase();
      cases = cases.filter(c => c.title.toLowerCase().includes(q2) || c.case_number.toLowerCase().includes(q2));
    }

    cases.slice(0, 30).forEach(c => {
      results.push({
        type: "case",
        id: c.id,
        title: c.case_number,
        subtitle: c.title,
        status: c.status,
        dept: c.dept_name ?? undefined,
        href: `/cases/${c.id}`,
      });
    });
  }

  if (!type || type === "users") {
    if (req.session.isSystemAdmin) {
      let users = await db
        .select({
          id: usersTable.id,
          full_name: usersTable.full_name,
          username: usersTable.username,
          dept_name: departmentsTable.name,
        })
        .from(usersTable)
        .leftJoin(departmentsTable, eq(usersTable.department_id, departmentsTable.id))
        .limit(100);

      if (query) {
        const q2 = query.toLowerCase();
        users = users.filter(u =>
          u.full_name.toLowerCase().includes(q2) ||
          u.username.toLowerCase().includes(q2)
        );
      }

      users.slice(0, 20).forEach(u => {
        results.push({
          type: "user",
          id: u.id,
          title: u.full_name,
          subtitle: `@${u.username}`,
          dept: u.dept_name ?? undefined,
          href: `/staff/${u.id}`,
        });
      });
    }
  }

  return res.json(results);
});

export default router;
