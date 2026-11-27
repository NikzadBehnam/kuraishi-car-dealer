import "server-only";

import type { PrismaClient } from "../generated/prisma/client.ts";
import { updateAdminInquiryStatusSchema } from "./admin-inquiry-validation.ts";
import { prisma } from "./db.ts";
import { AuthorizationError, requireSession } from "./session.ts";

type UpdateStatusResult =
  | { ok: true }
  | {
      ok: false;
      kind: "unauthorized" | "invalid" | "not_found";
      message: string;
    };

export async function updateAdminInquiryStatus(
  input: unknown,
  client: Pick<PrismaClient, "$executeRaw"> = prisma,
): Promise<UpdateStatusResult> {
  try {
    await requireSession();
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    return {
      ok: false,
      kind: "unauthorized",
      message: "Your session is no longer valid. Sign in again.",
    };
  }

  const parsed = updateAdminInquiryStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      kind: "invalid",
      message: "Select a valid inquiry status and try again.",
    };
  }

  const { inquiryId, status } = parsed.data;
  // Only status is writable by the runtime role; Prisma updates also touch updatedAt.
  const affected = await client.$executeRaw`
    UPDATE "Inquiry" SET "status" = ${status}::"InquiryStatus"
    WHERE "id" = ${inquiryId}
  `;
  return affected
    ? { ok: true }
    : {
        ok: false,
        kind: "not_found",
        message: "This inquiry no longer exists. Refresh the inbox.",
      };
}
