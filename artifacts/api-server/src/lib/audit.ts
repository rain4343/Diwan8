import type { Request } from "express";
import { db, auditLogsTable } from "@workspace/db";

export async function logAudit(
  req: Request,
  action: string,
  entityType: string,
  entityId?: number,
  entityLabel?: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
) {
  try {
    await db.insert(auditLogsTable).values({
      user_id: req.session?.userId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      entity_label: entityLabel ?? null,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
      ip_address: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null,
    });
  } catch {
    // non-fatal — audit failures must not break the main request
  }
}
