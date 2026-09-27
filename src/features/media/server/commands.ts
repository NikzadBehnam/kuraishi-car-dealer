import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  actionFailure,
  actionSuccess,
  type ActionFailure,
  type ActionResult,
} from "@/features/shared/action-result";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  authCapabilities,
  requireCapability,
} from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

import type { DeleteMediaAssetsResult } from "../dto.ts";
import { MediaProviderError } from "../provider.ts";
import { deleteMediaAssetsCommandSchema } from "../schemas.ts";
import { getMediaProvider } from "./provider.ts";

export async function deleteMediaAssets(
  input: unknown,
): Promise<ActionResult<DeleteMediaAssetsResult>> {
  try {
    const session = await requireCapability(
      authCapabilities.manageVehicleMedia,
    );
    const parsed = deleteMediaAssetsCommandSchema.safeParse(input);

    if (!parsed.success) return validationFailure(parsed.error);

    const assets = await prisma.mediaAsset.findMany({
      where: { id: { in: parsed.data.ids } },
      select: {
        id: true,
        provider: true,
        providerAssetId: true,
        title: true,
        vehicleId: true,
      },
    });

    if (assets.length !== parsed.data.ids.length) {
      return actionFailure(
        "NOT_FOUND",
        "One or more media assets no longer exist.",
      );
    }

    if (assets.some((asset) => asset.vehicleId !== null)) {
      return actionFailure(
        "CONFLICT",
        "Vehicle images must be detached from their vehicle before deletion.",
      );
    }

    const provider = getMediaProvider();

    if (assets.some((asset) => asset.provider !== provider.name)) {
      return actionFailure(
        "CONFLICT",
        "The selection contains an unsupported media provider.",
      );
    }

    await provider.deleteFiles(assets.map((asset) => asset.providerAssetId));

    await prisma.$transaction(async (transaction) => {
      await transaction.mediaAsset.deleteMany({
        where: { id: { in: parsed.data.ids } },
      });
      await transaction.activityEvent.createMany({
        data: assets.map((asset) =>
          buildMediaDeletedActivityEvent({
            actor: session.user,
            asset,
          }),
        ),
      });
    });

    return actionSuccess({
      deletedCount: assets.length,
      ids: parsed.data.ids,
    });
  } catch (error) {
    return commandFailure(error);
  }
}

function buildMediaDeletedActivityEvent({
  actor,
  asset,
}: {
  actor: {
    email: string;
    id: string;
    name: string;
    role?: string | null;
  };
  asset: {
    id: string;
    provider: string;
    providerAssetId: string;
    title: string;
  };
}): Prisma.ActivityEventUncheckedCreateInput {
  return {
    actorName: actor.name || actor.email,
    actorRole: actor.role ?? null,
    actorUserId: actor.id,
    metadata: {
      provider: asset.provider,
      providerAssetId: asset.providerAssetId,
    },
    severity: "warning",
    summary: `Deleted media asset ${asset.title}.`,
    targetId: asset.id,
    targetLabel: asset.title,
    targetType: "media",
    type: "media.deleted",
  };
}

function validationFailure(error: {
  issues: Array<{ message: string; path: PropertyKey[] }>;
}): ActionFailure {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field !== "string") continue;
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return actionFailure(
    "VALIDATION_ERROR",
    "Check the selected media assets.",
    Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  );
}

function commandFailure(error: unknown): ActionFailure {
  if (error instanceof AuthenticationRequiredError) {
    return actionFailure("AUTHENTICATION_REQUIRED", error.message);
  }

  if (error instanceof AuthorizationDeniedError) {
    return actionFailure("FORBIDDEN", error.message);
  }

  if (error instanceof MediaProviderError) {
    return actionFailure(
      error.code === "CONFIGURATION_ERROR"
        ? "INTERNAL_ERROR"
        : "EXTERNAL_SERVICE_ERROR",
      "The media provider could not delete the selected files. Please try again.",
    );
  }

  return actionFailure(
    "INTERNAL_ERROR",
    "The selected media assets could not be deleted. Please try again.",
  );
}
