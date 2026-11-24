"use server";

import { headers } from "next/headers";

import { createAccountSchema } from "@/app/(auth)/_schemas/auth.schema";
import { auth } from "@/lib/auth";
import { AuthorizationError, requireAdmin } from "@/lib/session";

export type CreateAccountResult = { ok: true } | { ok: false; error: string };

export async function createAccountAction(
  input: unknown,
): Promise<CreateAccountResult> {
  // Server Actions are public endpoints: re-check the session and role here.
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, error: "You are not allowed to create accounts." };
    }

    return { ok: false, error: "Could not verify your session." };
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
  } catch {
    console.error("Staff account creation failed.");
    return { ok: false, error: "The account could not be created." };
  }

  return { ok: true };
}
