import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

import {
  InventoryPolicyError,
  resolveInventoryPolicyUpdate,
} from "./inventory-lifecycle.ts";
import type { InventoryPolicyState } from "./inventory-policy.ts";
import {
  inventoryIdSchema,
  inventoryPolicyUpdateSchema,
} from "./inventory-validation.ts";

const published: InventoryPolicyState = {
  status: "published",
  inspectionStatus: "passed",
  isFeatured: true,
};

describe("inventory input and lifecycle boundary", () => {
  it("rejects malformed IDs, unsupported enums, empty and forged policy inputs", () => {
    for (const id of [
      "",
      " ",
      "../private",
      "car/1",
      "x".repeat(129),
      null,
      1,
    ]) {
      assert.equal(inventoryIdSchema.safeParse(id).success, false);
    }
    for (const input of [
      {},
      { status: "unknown" },
      { inspectionStatus: "approved" },
      { isFeatured: "true" },
      { isAvailable: true },
      { previousStatus: "draft", status: "published" },
      { updatedAt: "2026-11-16", status: "sold" },
    ]) {
      assert.equal(inventoryPolicyUpdateSchema.safeParse(input).success, false);
      assert.throws(
        () => resolveInventoryPolicyUpdate(published, input),
        z.ZodError,
      );
    }
    assert.equal(inventoryIdSchema.parse("vehicle_1-ab"), "vehicle_1-ab");
  });

  it("reports explicit errors for forbidden transitions and failed publication", () => {
    assert.throws(
      () =>
        resolveInventoryPolicyUpdate(
          { ...published, status: "sold" },
          { status: "published" },
        ),
      (error: unknown) =>
        error instanceof InventoryPolicyError &&
        error.code === "INVALID_TRANSITION" &&
        error.status === 409,
    );
    assert.throws(
      () =>
        resolveInventoryPolicyUpdate(
          { ...published, status: "draft", inspectionStatus: "pending" },
          { status: "published" },
        ),
      (error: unknown) =>
        error instanceof InventoryPolicyError &&
        error.code === "INSPECTION_REQUIRED" &&
        error.status === 422,
    );
  });

  it("withdraws advertised/reserved stock and clears promotion in one result", () => {
    for (const status of ["published", "reserved"] as const) {
      const current = { ...published, status };
      assert.deepEqual(
        resolveInventoryPolicyUpdate(current, { inspectionStatus: "failed" }),
        {
          status: "draft",
          inspectionStatus: "failed",
          isFeatured: false,
          isAvailable: false,
        },
      );
      assert.equal(current.status, status);
      assert.equal(current.inspectionStatus, "passed");
    }
  });

  it("derives flags and never automatically restores featured placement", () => {
    const reserved = resolveInventoryPolicyUpdate(published, {
      status: "reserved",
    });
    const restored = resolveInventoryPolicyUpdate(reserved, {
      status: "published",
    });
    assert.equal(reserved.isAvailable, false);
    assert.equal(reserved.isFeatured, false);
    assert.equal(restored.isAvailable, true);
    assert.equal(restored.isFeatured, false);
  });
});
