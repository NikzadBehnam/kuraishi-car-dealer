import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  leadContactSchema,
  leadListQuerySchema,
  leadPrioritySchema,
  leadSourceSchema,
} from "./schemas.ts";

describe("lead contracts", () => {
  it("normalizes customer contact data", () => {
    assert.deepEqual(
      leadContactSchema.parse({
        customerEmail: "  CUSTOMER@Example.COM ",
        customerName: "  Ada   Lovelace ",
        customerPhone: "  +43 664 123 45 67 ",
        message: "  Interested in this vehicle.  ",
      }),
      {
        customerEmail: "customer@example.com",
        customerName: "Ada Lovelace",
        customerPhone: "+43 664 123 45 67",
        message: "Interested in this vehicle.",
      },
    );
  });

  it("rejects unknown source and priority values", () => {
    assert.equal(leadSourceSchema.safeParse("social").success, false);
    assert.equal(leadPrioritySchema.safeParse("critical").success, false);
  });

  it("parses bounded, allowlisted inbox queries", () => {
    const result = leadListQuerySchema.parse({
      page: "2",
      priority: "urgent",
      sortDirection: "asc",
      status: "new",
    });

    assert.equal(result.page, 2);
    assert.equal(result.pageSize, 20);
    assert.equal(result.priority, "urgent");
    assert.equal(result.sortDirection, "asc");
    assert.equal(result.sortField, "createdAt");
  });
});
