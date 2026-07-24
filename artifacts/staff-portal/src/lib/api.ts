/**
 * Thin fetch wrapper for new API endpoints not yet in the generated client.
 * Uses the same credentials + origin strategy as auth.tsx.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const origin = window.location.origin;
  const res = await fetch(`${origin}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...((init?.headers as Record<string, string>) ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
