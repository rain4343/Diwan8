import { useAuth } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";

/**
 * Returns true if the current user is a system admin OR has the given
 * module.action permission via one of their roles.
 */
export function usePermission(module: string, action: string): boolean {
  const { user } = useAuth();
  return hasPermission(user, module, action);
}

/**
 * Returns true if the user has ANY permission in the given module
 * (used to decide whether to show a nav section).
 */
export function useModuleAccess(module: string): boolean {
  const { user } = useAuth();
  return hasModuleAccess(user, module);
}

// ── Pure helpers (no hooks) — safe to call inside JSX conditions ──

export function hasPermission(
  user: AuthUser | null,
  module: string,
  action: string,
): boolean {
  if (!user) return false;
  if (user.is_system_admin) return true;
  return user.permissions.includes(`${module}.${action}`);
}

export function hasModuleAccess(
  user: AuthUser | null,
  module: string,
): boolean {
  if (!user) return false;
  if (user.is_system_admin) return true;
  return user.permissions.some((p) => p.startsWith(`${module}.`));
}
