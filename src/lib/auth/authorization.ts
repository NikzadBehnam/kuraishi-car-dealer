import "server-only";

import { headers } from "next/headers";

import {
  adminRequestPathHeader,
  assertAdminAuthorizedForServerEntry,
  getAdminAuthorizationState,
  getSafeAdminReturnPath,
} from "./admin-route-policy.ts";
import { getServerAuthSession } from "./session.ts";

export async function getAdminAuthorizationForCurrentRequest() {
  return getAdminAuthorizationState(
    await getServerAuthSession(),
    await getCurrentAdminReturnPath(),
  );
}

export async function requireSession() {
  const session = await getServerAuthSession();

  if (!session) {
    assertAdminAuthorizedForServerEntry(session, await getCurrentAdminReturnPath());
  }

  return session;
}

export async function requireAdmin() {
  return assertAdminAuthorizedForServerEntry(
    await getServerAuthSession(),
    await getCurrentAdminReturnPath(),
  );
}

async function getCurrentAdminReturnPath() {
  const requestHeaders = await headers();

  return getSafeAdminReturnPath(
    requestHeaders.get(adminRequestPathHeader) ?? undefined,
  );
}
