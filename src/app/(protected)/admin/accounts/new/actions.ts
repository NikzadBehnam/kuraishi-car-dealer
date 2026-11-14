"use server";

import { headers } from "next/headers";

import { createAccountSchema } from "@/app/(auth)/_schemas/auth.schema";
import { auth } from "@/lib/auth";
import { getSession, isMasterAdmin } from "@/lib/session";

export type CreateAccountResult = { ok: true } | { ok: false; error: string };

export async function createAccountAction(
  input: unknown,
): Promise<CreateAccountResult> {
  // Server Actions are public endpoints: re-check the session and role here.
  const session = await getSession();

  if (!session || !isMasterAdmin(session.user.role)) {
    return { ok: false, error: "You are not allowed to create accounts." };
  }

  const parsed = createAccountSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid account details.",
    };
  }

  const { firstName, lastName, email, password } = parsed.data;

  try {
    // No role is sent: the Admin plugin assigns the default "user" role.
    await auth.api.createUser({
      body: { email, password, name: `${firstName} ${lastName}` },
      headers: await headers(),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "The account could not be created.";

    return { ok: false, error: message };
  }

  return { ok: true };
}
