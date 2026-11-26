import "server-only";

import { revalidatePath } from "next/cache";
import { cache } from "react";
import type { Prisma } from "../generated/prisma/client.ts";

import type {
  AdminDealershipSettingsDTO,
  PublicDealershipDTO,
} from "../types/dealership-settings.ts";
import {
  dealershipSettingsFieldsSchema,
  saveDealershipSettingsSchema,
  type DealershipSettingsFields,
} from "./dealership-settings-validation.ts";
import { prisma } from "./db.ts";
import { AuthorizationError, requireSession } from "./session.ts";

export const publicDealershipSelect = {
  name: true,
  shortName: true,
  tagline: true,
  websiteUrl: true,
  description: true,
  phone: true,
  phone2: true,
  phone3: true,
  legalForm: true,
  businessActivity: true,
  email: true,
  street: true,
  postalCode: true,
  city: true,
  country: true,
  mapUrl: true,
} satisfies Prisma.DealerSelect;

const adminDealershipSelect = {
  id: true,
  ...publicDealershipSelect,
  version: true,
} satisfies Prisma.DealerSelect;

type PublicDealershipRow = Prisma.DealerGetPayload<{
  select: typeof publicDealershipSelect;
}>;
type AdminDealershipRow = Prisma.DealerGetPayload<{
  select: typeof adminDealershipSelect;
}>;

type DealershipSettingsSaveResult =
  | { ok: true; settings: AdminDealershipSettingsDTO }
  | {
      ok: false;
      kind: "invalid";
      fieldErrors: Partial<Record<keyof DealershipSettingsFields, string>>;
      message?: string;
    }
  | { ok: false; kind: "unauthorized"; message: string }
  | {
      ok: false;
      kind: "conflict";
      settings: AdminDealershipSettingsDTO;
      message: string;
    };

function requireSingleDealership<T>(dealerships: T[]): T {
  if (dealerships.length === 0) {
    throw new Error(
      "Dealership settings are missing. Configure exactly one dealership record before serving business details.",
    );
  }
  if (dealerships.length > 1) {
    throw new Error(
      "Multiple dealership records exist; public dealership settings require exactly one.",
    );
  }
  return dealerships[0];
}

export function serializePublicDealership(
  row: PublicDealershipRow,
): PublicDealershipDTO {
  return {
    name: row.name,
    shortName: row.shortName,
    tagline: row.tagline,
    websiteUrl: row.websiteUrl,
    description: row.description,
    phone: row.phone,
    phone2: row.phone2,
    phone3: row.phone3,
    legalForm: row.legalForm,
    businessActivity: row.businessActivity,
    email: row.email,
    street: row.street,
    postalCode: row.postalCode,
    city: row.city,
    country: row.country,
    mapUrl: row.mapUrl,
  };
}

function serializeAdminDealership(
  row: AdminDealershipRow,
): AdminDealershipSettingsDTO {
  return { ...serializePublicDealership(row), version: row.version };
}

function findAdminDealerships(
  client: Pick<Prisma.TransactionClient, "dealer">,
) {
  return client.dealer.findMany({
    orderBy: { id: "asc" },
    select: adminDealershipSelect,
    take: 2,
  });
}

async function findSingleAdminDealership(): Promise<AdminDealershipRow> {
  return requireSingleDealership(await findAdminDealerships(prisma));
}

export const getPublicDealershipSettings = cache(
  async function getPublicDealershipSettings(): Promise<PublicDealershipDTO> {
    const rows = await prisma.dealer.findMany({
      orderBy: { id: "asc" },
      select: publicDealershipSelect,
      take: 2,
    });
    return serializePublicDealership(requireSingleDealership(rows));
  },
);

export const getAdminDealershipSettings = cache(
  async (): Promise<AdminDealershipSettingsDTO | null> => {
    await requireSession();
    const rows = await findAdminDealerships(prisma);
    return rows.length === 0
      ? null
      : serializeAdminDealership(requireSingleDealership(rows));
  },
);

export async function saveDealershipSettings(
  input: unknown,
): Promise<DealershipSettingsSaveResult> {
  try {
    await requireSession();
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

  const parsed = saveDealershipSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof DealershipSettingsFields, string>> =
      {};
    let message: string | undefined;
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        typeof field === "string" &&
        Object.hasOwn(dealershipSettingsFieldsSchema.shape, field)
      ) {
        fieldErrors[field as keyof DealershipSettingsFields] ??= issue.message;
      } else {
        message ??= issue.message;
      }
    }
    return {
      ok: false,
      kind: "invalid",
      fieldErrors,
      message: message ?? "Review the highlighted settings and try again.",
    };
  }

  const {
    expectedVersion,
    phone2,
    phone3,
    legalForm,
    businessActivity,
    ...fields
  } = parsed.data;
  const changes = {
    ...fields,
    ...(phone2 !== undefined && { phone2: phone2 || null }),
    ...(phone3 !== undefined && { phone3: phone3 || null }),
    ...(legalForm !== undefined && { legalForm: legalForm || null }),
    ...(businessActivity !== undefined && {
      businessActivity: businessActivity || null,
    }),
  };
  if (expectedVersion === null) {
    const result = await prisma.$transaction(
      async (tx): Promise<DealershipSettingsSaveResult> => {
        // Lock before reading so competing first saves cannot both see an empty table.
        await tx.$executeRaw`LOCK TABLE "Dealer" IN SHARE ROW EXCLUSIVE MODE`;
        const rows = await findAdminDealerships(tx);
        if (rows.length !== 0) {
          return {
            ok: false,
            kind: "conflict",
            settings: serializeAdminDealership(requireSingleDealership(rows)),
            message:
              "Another session already created the dealership. Reload the latest settings before editing.",
          };
        }
        const created = await tx.dealer.create({
          data: changes,
          select: adminDealershipSelect,
        });
        return { ok: true, settings: serializeAdminDealership(created) };
      },
      { isolationLevel: "ReadCommitted" },
    );
    if (result.ok) {
      revalidatePath("/", "layout");
    }
    return result;
  }

  const current = await findSingleAdminDealership();
  if (current.version !== expectedVersion) {
    return {
      ok: false,
      kind: "conflict",
      settings: serializeAdminDealership(current),
      message:
        "The dealership settings changed since they were loaded. Reload the latest values before saving.",
    };
  }

  const updated = await prisma.dealer.updateMany({
    where: { id: current.id, version: expectedVersion },
    data: { ...changes, version: { increment: 1 } },
  });
  if (updated.count !== 1) {
    return {
      ok: false,
      kind: "conflict",
      settings: serializeAdminDealership(await findSingleAdminDealership()),
      message:
        "The dealership settings changed while saving. Reload the latest values before trying again.",
    };
  }

  const saved = await prisma.dealer.findUniqueOrThrow({
    where: { id: current.id },
    select: adminDealershipSelect,
  });
  revalidatePath("/", "layout");
  return { ok: true, settings: serializeAdminDealership(saved) };
}
