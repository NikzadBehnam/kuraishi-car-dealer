import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getAdminInquiryWhere } from "./admin-inquiry-query.ts";

describe("admin inquiry search query", () => {
  it("searches every term across customer, message, and vehicle fields", () => {
    const where = getAdminInquiryWhere("  MAX   golf ");
    assert.deepEqual(where, {
      AND: [
        {
          OR: [
            { customerName: { contains: "max", mode: "insensitive" } },
            { customerEmail: { contains: "max", mode: "insensitive" } },
            { customerPhone: { contains: "max", mode: "insensitive" } },
            { message: { contains: "max", mode: "insensitive" } },
            { vehicleTitleSnapshot: { contains: "max", mode: "insensitive" } },
            {
              vehicle: {
                is: {
                  OR: [
                    { make: { contains: "max", mode: "insensitive" } },
                    { model: { contains: "max", mode: "insensitive" } },
                    { variant: { contains: "max", mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        },
        {
          OR: [
            { customerName: { contains: "golf", mode: "insensitive" } },
            { customerEmail: { contains: "golf", mode: "insensitive" } },
            { customerPhone: { contains: "golf", mode: "insensitive" } },
            { message: { contains: "golf", mode: "insensitive" } },
            { vehicleTitleSnapshot: { contains: "golf", mode: "insensitive" } },
            {
              vehicle: {
                is: {
                  OR: [
                    { make: { contains: "golf", mode: "insensitive" } },
                    { model: { contains: "golf", mode: "insensitive" } },
                    { variant: { contains: "golf", mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("leaves an empty search unfiltered", () => {
    assert.deepEqual(getAdminInquiryWhere("   "), {});
  });
});
