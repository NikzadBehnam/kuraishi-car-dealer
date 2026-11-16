import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  assertAdminSession,
  assertAuthenticatedSession,
} from "@/lib/auth-access";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export { AuthorizationError, isMasterAdmin } from "@/lib/auth-access";

// Call at the start of every Server Action, Route Handler and data operation.
export async function requireSession() {
  return assertAuthenticatedSession(await getSession());
}

export async function requireAdmin() {
  return assertAdminSession(await getSession());
}
