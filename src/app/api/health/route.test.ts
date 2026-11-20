import assert from "node:assert/strict";
import { test } from "node:test";

import { createReadinessResponse } from "../../../lib/health-response.ts";

test("returns only aggregate ready status without caching", async () => {
  const response = createReadinessResponse(true);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("returns a generic unavailable status when dependencies are not ready", async () => {
  const response = createReadinessResponse(false);

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "unavailable" });
});
