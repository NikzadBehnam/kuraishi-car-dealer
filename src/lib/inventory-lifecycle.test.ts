import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

import type { AdminVehicleStatus } from "../types/admin.ts";
import {
  InventoryPolicyError,
  resolveInventoryPolicyUpdate,
} from "./inventory-lifecycle.ts";
import type { InventoryPolicyState } from "./inventory-policy.ts";
import {
  inventoryIdSchema,
  inventoryPaginationSchema,
  inventoryPolicyUpdateSchema,
  inventorySelectionSchema,
  staffInventorySearchParamsSchema,
} from "./inventory-validation.ts";

const published: InventoryPolicyState = {
  status: "published",
  inspectionStatus: "passed",
  isFeatured: true,
};

describe("inventory input and lifecycle boundary", () => {
  it("bounds database pagination without silently clamping invalid requests", () => {
    assert.deepEqual(inventoryPaginationSchema.parse({}), {
      page: 1,
      pageSize: 8,
      skip: 0,
      take: 8,
    });
    assert.deepEqual(
      inventoryPaginationSchema.parse({ page: 3, pageSize: 100 }),
      { page: 3, pageSize: 100, skip: 200, take: 100 },
    );
    for (const input of [
      { page: 0 },
      { page: 1.5 },
      { page: "1" },
      { pageSize: 0 },
      { pageSize: 101 },
      { page: Number.MAX_SAFE_INTEGER, pageSize: 100 },
      { page: 2_147_483_649, pageSize: 1 },
      { take: 1000 },
    ]) {
      assert.equal(inventoryPaginationSchema.safeParse(input).success, false);
    }
  });

  it("parses positive integer staff page parameters from URLs", () => {
    assert.equal(staffInventorySearchParamsSchema.parse({}).page, 1);
    assert.deepEqual(
      staffInventorySearchParamsSchema.parse({ page: "3", search: " BMW " }),
      {
        search: "BMW",
        sort: "lastUpdatedAt",
        direction: "desc",
        page: 3,
      },
    );
    for (const page of [
      "0",
      "-1",
      "1.5",
      "2x",
      "268435457",
      "9007199254740992",
      ["2"],
    ]) {
      assert.equal(
        staffInventorySearchParamsSchema.safeParse({ page }).success,
        false,
      );
    }
  });

  it("accepts only explicit unique inventory selection IDs", () => {
    assert.deepEqual(
      inventorySelectionSchema.parse({ ids: ["vehicle-1", "vehicle-2"] }),
      { ids: ["vehicle-1", "vehicle-2"] },
    );
    for (const input of [
      {},
      { ids: [] },
      { ids: ["vehicle-1", "vehicle-1"] },
      { ids: ["../private"] },
      { all: true, ids: ["vehicle-1"] },
    ]) {
      assert.equal(inventorySelectionSchema.safeParse(input).success, false);
    }
  });

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
      for (const inspectionStatus of [
        "pending",
        "in_progress",
        "failed",
      ] as const) {
        const current = { ...published, status };
        assert.deepEqual(
          resolveInventoryPolicyUpdate(current, { inspectionStatus }),
          {
            status: "draft",
            inspectionStatus,
            isFeatured: false,
            isAvailable: false,
          },
        );
        assert.equal(current.status, status);
        assert.equal(current.inspectionStatus, "passed");
      }
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
    assert.equal(
      resolveInventoryPolicyUpdate(
        { ...reserved, isFeatured: true },
        { status: "published" },
      ).isFeatured,
      false,
    );
  });

  it("does not bypass inspection withdrawal with a simultaneous sale or archive", () => {
    for (const status of ["published", "reserved"] as const) {
      for (const requestedStatus of ["sold", "archived"] as const) {
        assert.deepEqual(
          resolveInventoryPolicyUpdate(
            { ...published, status },
            { status: requestedStatus, inspectionStatus: "failed" },
          ),
          {
            status: "draft",
            inspectionStatus: "failed",
            isFeatured: false,
            isAvailable: false,
          },
        );
      }
    }
  });

  const allowed: Record<AdminVehicleStatus, readonly AdminVehicleStatus[]> = {
    draft: ["published", "archived"],
    published: ["draft", "reserved", "sold", "archived"],
    reserved: ["published", "draft", "sold", "archived"],
    sold: ["archived", "draft"],
    archived: ["draft"],
  };
  const statuses: AdminVehicleStatus[] = [
    "draft",
    "published",
    "reserved",
    "sold",
    "archived",
  ];

  for (const from of statuses) {
    it(`enforces all lifecycle destinations from ${from}`, () => {
      for (const to of statuses) {
        const current = { ...published, status: from };
        if (from === to || allowed[from].includes(to)) {
          const result = resolveInventoryPolicyUpdate(current, { status: to });
          assert.equal(result.status, to);
          assert.equal(result.isAvailable, to === "published");
          assert.equal(
            result.isFeatured,
            from === "published" && to === "published",
          );
        } else {
          assert.throws(
            () => resolveInventoryPolicyUpdate(current, { status: to }),
            (error: unknown) =>
              error instanceof InventoryPolicyError &&
              error.code === "INVALID_TRANSITION",
            `${from} -> ${to}`,
          );
        }
      }
    });
  }

  it("permits explicit promotion after inspection passes but rejects premature publication", () => {
    for (const inspectionStatus of [
      "pending",
      "in_progress",
      "failed",
    ] as const) {
      const draft = {
        ...published,
        status: "draft",
        inspectionStatus,
      } as const;
      assert.throws(
        () => resolveInventoryPolicyUpdate(draft, { status: "published" }),
        (error: unknown) =>
          error instanceof InventoryPolicyError &&
          error.code === "INSPECTION_REQUIRED",
      );
      assert.deepEqual(
        resolveInventoryPolicyUpdate(draft, {
          status: "published",
          inspectionStatus: "passed",
          isFeatured: true,
        }),
        {
          status: "published",
          inspectionStatus: "passed",
          isFeatured: true,
          isAvailable: true,
        },
      );
    }
  });
});
