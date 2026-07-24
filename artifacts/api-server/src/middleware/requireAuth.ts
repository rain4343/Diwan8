import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  permissionsTable,
  rolePermissionsTable,
  roleUserTable,
  userPermissionsTable,
} from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    full_name: string;
    email: string;
    isSystemAdmin: boolean;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "داخڵ نەبووی — تکایە سەرەتا بچۆ ژوورەوە" });
    return;
  }
  next();
}

// Restricts a route to the single designated system administrator account.
// Must run after requireAuth (relies on req.session.userId already being set).
export function requireSystemAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isSystemAdmin) {
    res.status(403).json({ error: "تەنها بەڕێوەبەری سیستم دەسەڵاتی ئەم کردارەی هەیە" });
    return;
  }
  next();
}

export async function hasPermission(userId: number, module: string, action: string): Promise<boolean> {
  const permissionName = `${module}.${action}`;
  const [directRows, roleRows] = await Promise.all([
    db
      .select({ name: permissionsTable.name })
      .from(userPermissionsTable)
      .innerJoin(permissionsTable, eq(userPermissionsTable.permission_id, permissionsTable.id))
      .where(eq(userPermissionsTable.user_id, userId)),
    db
      .select({ name: permissionsTable.name })
      .from(roleUserTable)
      .innerJoin(rolePermissionsTable, eq(roleUserTable.role_id, rolePermissionsTable.role_id))
      .innerJoin(permissionsTable, eq(rolePermissionsTable.permission_id, permissionsTable.id))
      .where(eq(roleUserTable.user_id, userId)),
  ]);

  return [...directRows, ...roleRows].some((row) => row.name === permissionName);
}

/**
 * Checks the permission model at request time. This intentionally reads the
 * database instead of copying permissions into the session, so changing a
 * role or a direct user permission takes effect immediately.
 */
export function requirePermission(module: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.session?.isSystemAdmin) {
      next();
      return;
    }

    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({ error: "داخڵ نەبووی — تکایە سەرەتا بچۆ ژوورەوە" });
      return;
    }

    try {
      const allowed = await hasPermission(userId, module, action);
      if (!allowed) {
        const permissionName = `${module}.${action}`;
        res.status(403).json({ error: `دەسەڵاتی ${permissionName} ـت نییە` });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
