import "server-only";

import type { PrismaClient } from "../generated/prisma/client.ts";
import { revalidatePath } from "next/cache";

import { adminRoutes } from "../config/admin-routes.config.ts";
import { prisma } from "./db.ts";
import { addAdminInquiryNoteSchema } from "./admin-inquiry-validation.ts";
import { AuthorizationError, requireSession } from "./session.ts";

type AdminInquiryNoteClient = Pick<PrismaClient, "$transaction">;

export type AddAdminInquiryNoteResult =
  | { ok: true }
  | {
      ok: false;
      kind: "invalid" | "not_found" | "unauthorized";
      message: string;
    };

export async function addAdminInquiryNote(
  input: unknown,
  client: AdminInquiryNoteClient = prisma,
): Promise<AddAdminInquiryNoteResult> {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return {
        ok: false,
        kind: "unauthorized",
        message: "Your session is no longer valid. Sign in again.",
      };
    }
    throw error;
  }

  const parsed = addAdminInquiryNoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      kind: "invalid",
      message:
        parsed.error.issues[0]?.message ?? "Review the note and try again.",
    };
  }

  const created = await client.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.findUnique({
      where: { id: parsed.data.inquiryId },
      select: { id: true },
    });
    if (!inquiry) return false;

    await tx.inquiryNote.create({
      data: {
        inquiryId: inquiry.id,
        authorId: session.user.id,
        content: parsed.data.content,
      },
      select: { id: true },
    });
    return true;
  });

  if (!created) {
    return {
      ok: false,
      kind: "not_found",
      message: "This inquiry no longer exists. Refresh the inbox.",
    };
  }

  revalidatePath(adminRoutes.leads);
  return { ok: true };
}
