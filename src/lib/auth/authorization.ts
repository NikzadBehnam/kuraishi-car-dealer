import "server-only";

import { headers } from "next/headers";

import {
  adminRequestPathHeader,
  getAdminAuthorizationState,
  getSafeAdminReturnPath,
} from "./admin-route-policy.ts";
import {
  assertAuthenticatedSession,
  assertCapability,
  authCapabilities,
  type AuthCapability,
} from "./authorization-policy.ts";
import { getServerAuthSession } from "./session.ts";

export {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  authCapabilities,
} from "./authorization-policy.ts";
export type { AuthCapability } from "./authorization-policy.ts";

export async function getAdminAuthorizationForCurrentRequest() {
  return getAdminAuthorizationState(
    await getServerAuthSession(),
    await getCurrentAdminReturnPath(),
  );
}

export async function requireSession() {
  return assertAuthenticatedSession(await getServerAuthSession());
}

export async function requireAdmin() {
  return requireCapability(authCapabilities.enterAdmin);
}

export async function requireCapability(capability: AuthCapability) {
  return assertCapability(await getServerAuthSession(), capability);
}

async function getCurrentAdminReturnPath() {
  const requestHeaders = await headers();

  return getSafeAdminReturnPath(
    requestHeaders.get(adminRequestPathHeader) ?? undefined,
  );
}
