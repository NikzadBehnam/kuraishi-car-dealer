import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../src/generated/prisma/client.ts";
import { createInventoryTestDatabase } from "./inventory-test-client.ts";

export async function withLeadsTestRuntime<T>(
  run: (client: PrismaClient, role: string) => Promise<T>,
): Promise<T> {
  const { prisma: owner, connectionString } = createInventoryTestDatabase();
  const target = new URL(connectionString);
  const role = `leads_test_${randomBytes(8).toString("hex")}`;
  const password = randomBytes(32).toString("hex");
  let created = false;
  let runtime: PrismaClient | undefined;
  try {
    assert.match(
      target.pathname,
      /^\/[a-z][a-z0-9_]*_(?:test|checks)(?:_[a-z0-9]+)?$/,
      "Use a dedicated disposable test database with _test or _checks in its name.",
    );
    assert.notEqual(
      target.hostname.split(".")[0],
      "ep-silent-mountain-b966e9p0",
    );
    const [context] = await owner.$queryRaw<
      { database: string; ownsInquiry: boolean }[]
    >`
      SELECT current_database()::text AS database,
        pg_get_userbyid(relowner) = current_user AS "ownsInquiry"
      FROM pg_class WHERE oid = 'public."Inquiry"'::regclass
    `;
    assert.equal(context.database, target.pathname.slice(1));
    assert.equal(context.ownsInquiry, true);

    await owner.$executeRawUnsafe(
      `CREATE ROLE ${role} LOGIN PASSWORD '${password}'`,
    );
    created = true;
    await owner.$executeRawUnsafe(`GRANT ${role} TO CURRENT_USER`);
    for (const grant of [
      `GRANT USAGE ON SCHEMA public TO ${role}`,
      `GRANT SELECT ON public."Inquiry", public."Vehicle", public."user" TO ${role}`,
      `GRANT SELECT, INSERT ON public."InquiryNote" TO ${role}`,
      `GRANT UPDATE ("status") ON public."Inquiry" TO ${role}`,
      `GRANT SELECT ("id", "inquiryId", "status", "attemptCount", "lastErrorCode", "nextAttemptAt", "sentAt") ON public."InquiryNotification" TO ${role}`,
    ]) {
      await owner.$executeRawUnsafe(grant);
    }

    target.username = role;
    target.password = password;
    runtime = new PrismaClient({
      adapter: new PrismaNeon({ connectionString: target.href }),
    });
    const [identity] = await runtime.$queryRaw<
      { role: string }[]
    >`SELECT current_user::text AS role`;
    assert.equal(identity.role, role);
    return await run(runtime, role);
  } finally {
    try {
      await runtime?.$disconnect();
      if (created) {
        await owner.$executeRawUnsafe(`DROP OWNED BY ${role}`);
        await owner.$executeRawUnsafe(`DROP ROLE ${role}`);
      }
    } finally {
      await owner.$disconnect();
    }
  }
}
