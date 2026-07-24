---
name: System-admin flag pattern (staff-portal)
description: How "only one specific admin account" authorization is implemented across the staff-portal/api-server, and a known inconsistency left in documents.ts.
---

The staff-portal distinguishes "holds the Super Admin role" (many people, e.g. multiple department heads) from
"is THE designated system administrator" (exactly one account). The latter is a boolean `is_system_admin` column
on `users`, not a role — role membership is many-to-many and not suited to single-account gating.

**Why:** the user explicitly wanted one named account (not every Super Admin) to get full create/edit/delete
control over users, roles, and departments, while other Super Admins keep normal (self-service-only) access.

**How to apply:**
- The flag is cached into the Express session at login (`req.session.isSystemAdmin`) and returned by
  `/auth/login` and `/auth/me` as `is_system_admin`, same caching convention as `full_name`/`email` — it does not
  re-read the DB per request. A session predating this feature (or the account's flag changing) requires re-login.
- `requireSystemAdmin` middleware in `requireAuth.ts` gates mutation routes (create/delete users, roles, departments,
  bulk import). `PATCH /users/:id` is the one exception with mixed logic: any authenticated user may edit their own
  full_name/email/phone/password (Profile self-service), but changing `role_ids`/`department_id`, or editing another
  user, requires the system-admin flag.
- Nothing exposes `is_system_admin` as a settable API field (omitted from the orval-generated Create/UpdateUserBody
  schemas) — granting the flag to a new account requires a direct DB update, by design, to avoid privilege escalation
  via the users API.
- Known pre-existing inconsistency, left as-is (out of scope when this was built): `documents.ts` still hardcodes
  `userId === 1` for a separate "can forward documents" bypass, instead of using `is_system_admin`. If the system
  admin account ever changes, that check will silently stop matching the new admin.
