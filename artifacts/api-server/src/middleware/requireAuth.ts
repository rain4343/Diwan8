import type { Request, Response, NextFunction } from "express";

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
