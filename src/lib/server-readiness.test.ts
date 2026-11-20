import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { onRequestError } from "../instrumentation.ts";
import {
  areDependenciesReady,
  type ReadinessChecks,
} from "./server-readiness.ts";

test("runs every dependency check and reports only aggregate readiness", async () => {
  const checked: string[] = [];
  const checks: ReadinessChecks = {
    database: async () => {
      checked.push("database");
    },
    storage: async () => {
      checked.push("storage");
    },
    delivery: async () => {
      checked.push("delivery");
    },
  };

  assert.equal(await areDependenciesReady(checks), true);
  assert.deepEqual(checked.sort(), ["database", "delivery", "storage"]);
});

test("logs failed dependency labels without error details", async () => {
  const secret = "visitor@example.invalid";
  const logger = mock.method(console, "error", () => {});
  const checks: ReadinessChecks = {
    database: async () => {
      throw new Error(secret);
    },
    storage: async () => {
      throw new Error(secret);
    },
    delivery: async () => {
      throw new Error(secret);
    },
  };

  try {
    assert.equal(await areDependenciesReady(checks), false);
    assert.equal(logger.mock.callCount(), 3);
    assert.equal(JSON.stringify(logger.mock.calls).includes(secret), false);
    assert.match(JSON.stringify(logger.mock.calls), /database/);
    assert.match(JSON.stringify(logger.mock.calls), /storage/);
    assert.match(JSON.stringify(logger.mock.calls), /delivery/);
  } finally {
    logger.mock.restore();
  }
});

test("reports unhandled request categories without request or error contents", async () => {
  const secret = "private-message-and-auth-token";
  const logger = mock.method(console, "error", () => {});

  try {
    await onRequestError(
      new Error(secret),
      {
        path: `/api/health?message=${secret}`,
        method: "GET",
        headers: { authorization: secret },
      },
      {
        routerKind: "App Router",
        routePath: "/api/health",
        routeType: "route",
        revalidateReason: undefined,
      },
    );

    const logged = JSON.stringify(logger.mock.calls);
    assert.equal(logged.includes(secret), false);
    assert.match(logged, /App Router/);
    assert.match(logged, /route/);
  } finally {
    logger.mock.restore();
  }
});
