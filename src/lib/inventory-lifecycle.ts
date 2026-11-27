import type { AdminVehicleStatus } from "../types/admin.ts";
import type { InventoryPolicyState } from "./inventory-policy.ts";
import {
  inventoryPolicyStateSchema,
  inventoryPolicyUpdateSchema,
} from "./inventory-validation.ts";

const transitions: Record<AdminVehicleStatus, readonly AdminVehicleStatus[]> = {
  draft: ["published", "archived"],
  published: ["draft", "reserved", "sold", "archived"],
  reserved: ["published", "draft", "sold", "archived"],
  sold: ["archived", "draft"],
  archived: ["draft"],
};

export class InventoryPolicyError extends Error {
  readonly code:
    "INVALID_TRANSITION" | "INSPECTION_REQUIRED" | "PUBLIC_IMAGE_REQUIRED";
  readonly status: 409 | 422;

  constructor(code: InventoryPolicyError["code"], message: string) {
    super(message);
    this.name = "InventoryPolicyError";
    this.code = code;
    this.status = code === "INVALID_TRANSITION" ? 409 : 422;
  }
}

export const MINIMUM_PUBLISHABLE_VEHICLE_IMAGES = 1;

export function resolveInventoryPolicyUpdate(
  current: InventoryPolicyState,
  input: unknown,
  photoCount = 0,
): InventoryPolicyState & { isAvailable: boolean } {
  const stored = inventoryPolicyStateSchema.parse({
    status: current.status,
    inspectionStatus: current.inspectionStatus,
    isFeatured: current.isFeatured,
  });
  const update = inventoryPolicyUpdateSchema.parse(input);
  let status = update.status ?? stored.status;
  const inspectionStatus = update.inspectionStatus ?? stored.inspectionStatus;

  if (
    status !== stored.status &&
    !transitions[stored.status].includes(status)
  ) {
    throw new InventoryPolicyError(
      "INVALID_TRANSITION",
      `Cannot change vehicle status from ${stored.status} to ${status}.`,
    );
  }

  const changingInspection = update.inspectionStatus !== undefined;
  if (
    changingInspection &&
    inspectionStatus !== "passed" &&
    (stored.status === "published" || stored.status === "reserved")
  ) {
    status = "draft";
  }

  if (
    (status === "published" || status === "reserved") &&
    inspectionStatus !== "passed"
  ) {
    throw new InventoryPolicyError(
      "INSPECTION_REQUIRED",
      "A passed inspection is required before publishing or reserving a vehicle.",
    );
  }

  if (
    status === "published" &&
    stored.status !== "published" &&
    photoCount < MINIMUM_PUBLISHABLE_VEHICLE_IMAGES
  ) {
    throw new InventoryPolicyError(
      "PUBLIC_IMAGE_REQUIRED",
      "Add at least one vehicle photo before publishing.",
    );
  }

  return {
    status,
    inspectionStatus,
    isAvailable: status === "published",
    isFeatured:
      status === "published" &&
      (update.isFeatured ??
        (stored.status === "published" && stored.isFeatured)),
  };
}
