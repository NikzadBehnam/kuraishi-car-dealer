import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export class AuthorizationError extends Error {
  constructor(
    readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export function isMasterAdmin(role: string | null | undefined) {
  return role === "admin";
}

// Call at the start of every Server Action, Route Handler and data operation.
export async function requireSession() {
  const session = await getSession();

  if (!session) {
    throw new AuthorizationError(401, "Sign in required.");
  }

  return session;
}

export async function requireAdmin() {
  const session = await requireSession();

  if (!isMasterAdmin(session.user.role)) {
    throw new AuthorizationError(403, "Administrator access required.");
  }

  return session;
}
