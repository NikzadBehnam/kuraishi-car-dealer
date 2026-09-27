import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAdminLeadOrderBy, buildAdminLeadWhere } from "./query-policy.ts";
import { leadListQuerySchema } from "./schemas.ts";

describe("admin lead query policy", () => {
  it("builds allowlisted filters and maps the test-drive source", () => {
    const query = leadListQuerySchema.parse({
      assignedToUserId: "cm1234567890123456789012",
      priority: "urgent",
      search: " Golf ",
      source: "test-drive",
      status: "new",
    });
    const where = buildAdminLeadWhere(query);
    const conditions = where.AND;

    if (!Array.isArray(conditions)) {
      assert.fail("Expected the lead filters to be an AND array.");
    }

    assert.deepEqual(conditions.slice(0, 4), [
      { assignedToUserId: "cm1234567890123456789012" },
      { priority: "urgent" },
      { source: "test_drive" },
      { status: "new" },
    ]);
    assert.equal(conditions.length, 5);
  });

  it("builds deterministic ordering", () => {
    const query = leadListQuerySchema.parse({
      sortDirection: "asc",
      sortField: "priority",
    });

    assert.deepEqual(buildAdminLeadOrderBy(query), [
      { priority: "asc" },
      { id: "asc" },
    ]);
  });
});
