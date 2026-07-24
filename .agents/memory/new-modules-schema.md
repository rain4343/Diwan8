---
name: New modules schema and API patterns
description: Architecture decisions for the workflow, cases, notifications, audit, reports, search, and permissions modules added in the July 2026 build session.
---

## New DB Tables (lib/db/src/schema/)
- `document_workflow_steps` — tracks every state transition; joined to `workflow_step` varchar column added to `documentsTable`
- `document_assignments` — assigned_to/by, due_date, priority, status
- `cases` + `case_documents` — groups docs by topic; doc linking via junction table
- `deadlines` — due_date/reminder_date per document; is_overdue flag
- `notifications` — user_id, type, title, message, data JSONB, is_read
- `audit_logs` — user_id, action, entity_type, entity_id, old/new_value JSONB, ip_address
- `permissions` + `role_permissions` — module/action enum-based permission model
- `document_tags`, `document_comments`, `reports_config` — all in tags.ts

## Documents table additions
Added `workflow_step` varchar (default "draft"), `from_dept_id`, `to_dept_id` foreign keys.

## Backend libs
- `lib/audit.ts` — `logAudit(req, action, entity_type, entity_id, ...)` — non-fatal, catches all errors
- `lib/notify.ts` — `sendNotification(userId, type, title, message, data)` — inserts to DB + emits `notification` event to `user:<userId>` Socket.IO room
- Socket.IO: each connected user joins `user:${userId}` room for targeted push

## API Routes pattern
All new routes added to `artifacts/api-server/src/routes/index.ts` as protected (requireAuth).
Audit log and permissions routes additionally use `requireSystemAdmin`.

## Frontend pattern
New pages do NOT use the auto-generated `@workspace/api-client-react` hooks.
Instead they import `apiFetch` from `@/lib/api` — a thin fetch wrapper with session cookies.

**Why:** Regenerating the OpenAPI client requires updating the spec, which adds a full code-gen cycle. For new endpoints, direct fetch is faster and avoids spec drift.

## Frontend pages added
- Cases, CaseDetail, Reports, AuditLog, SearchPage, NotificationsPage
- WorkflowPanel component (used inside DocumentDetail) — step pills + timeline + advance dialog
- NotificationBell component — unread badge, listens to socket `notification` event

## Socket.IO notification flow
1. Backend calls `sendNotification(userId, ...)` from `lib/notify.ts`
2. `notify.ts` inserts row into `notifications` table
3. `notify.ts` emits `notification` event to `user:${userId}` Socket.IO room
4. Frontend `NotificationBell` listens for `notification` event and invalidates React Query cache
