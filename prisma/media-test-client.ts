import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { PrismaClient } from "../src/generated/prisma/client.ts";

export function createMediaTestDatabase() {
  if (existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  }
  assert.ok(
    process.env.NODE_ENV !== "production" &&
      process.env.VERCEL === undefined &&
      process.env.VERCEL_ENV === undefined,
    "Media migration tests are local development only; production and Vercel execution are refused.",
  );
  const connectionString = process.env.MEDIA_TEST_DATABASE_URL;
  const expectedHost = process.env.MEDIA_TEST_EXPECTED_HOST;
  assert.ok(connectionString, "Provide an explicit isolated media-test URL.");
  assert.ok(
    expectedHost,
    "Provide the control-plane-verified media-test host.",
  );
  const target = new URL(connectionString);
  assert.ok(["postgres:", "postgresql:"].includes(target.protocol));
  assert.equal(target.hostname, expectedHost, "Unexpected test database host.");
  assert.match(
    target.hostname,
    /^ep-[a-z0-9-]+\.c-\d+\.[a-z0-9-]+\.aws\.neon\.tech$/,
  );
  assert.equal(
    target.hostname.includes("-pooler."),
    false,
    "Use a direct connection.",
  );
  for (const configured of [
    process.env.DATABASE_URL,
    process.env.DIRECT_URL,
    process.env.INVENTORY_TEST_DATABASE_URL,
  ]) {
    if (configured) {
      assert.notEqual(
        new URL(configured).hostname.replace("-pooler.", "."),
        target.hostname,
        "Refusing to test against another configured database.",
      );
    }
  }
  neonConfig.webSocketConstructor = ws;
  return {
    connectionString,
    prisma: new PrismaClient({ adapter: new PrismaNeon({ connectionString }) }),
  };
}
