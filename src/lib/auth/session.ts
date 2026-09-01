import "server-only";

import { headers } from "next/headers";

import { auth } from "./server.ts";

export async function getServerAuthSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
