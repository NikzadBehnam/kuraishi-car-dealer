import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";

import { createAccountSchema } from "../../../../(auth)/_schemas/auth.schema.ts";
import {
  assertAdminSession,
  type AuthSession,
  AuthorizationError,
} from "../../../../../lib/auth-access.ts";

let session: AuthSession | null = null;
let createdUserBody: unknown;
let createdUserHeaders: Headers | undefined;
const requestHeaders = new Headers({ "x-test-request": "create-account" });
let headersMock: ReturnType<typeof mock.module> | undefined;
let authMock: ReturnType<typeof mock.module> | undefined;
let sessionMock: ReturnType<typeof mock.module> | undefined;
let action: typeof import("./actions.ts");

describe("createAccountAction integration", { concurrency: false }, () => {
  before(async () => {
    headersMock = mock.module("next/headers", {
      namedExports: { headers: async () => requestHeaders },
    });
    authMock = mock.module("@/lib/auth", {
      namedExports: {
        auth: {
          api: {
            createUser: async ({
              body,
              headers,
            }: {
              body: unknown;
              headers: Headers;
            }) => {
              createdUserBody = body;
              createdUserHeaders = headers;
            },
          },
        },
      },
    });
    sessionMock = mock.module("@/lib/session", {
      namedExports: {
        AuthorizationError,
        requireAdmin: async () => assertAdminSession(session),
      },
    });
    mock.module("@/app/(auth)/_schemas/auth.schema", {
      namedExports: { createAccountSchema },
    });
    action = await import("./actions.ts");
  });

  beforeEach(() => {
    session = null;
    createdUserBody = undefined;
    createdUserHeaders = undefined;
  });

  after(() => {
    headersMock?.restore();
    authMock?.restore();
    sessionMock?.restore();
  });

  it("rejects anonymous callers before calling Better Auth", async () => {
    const result = await action.createAccountAction({
      firstName: "Staff",
      lastName: "Member",
      email: "staff@example.invalid",
      password: "a-secure-test-password",
    });

    assert.deepEqual(result, {
      ok: false,
      error: "You are not allowed to create accounts.",
    });
    assert.equal(createdUserBody, undefined);
  });

  it("rejects regular staff before calling Better Auth", async () => {
    session = { user: { role: "user" } };
    const result = await action.createAccountAction({
      firstName: "Staff",
      lastName: "Member",
      email: "staff@example.invalid",
      password: "a-secure-test-password",
    });

    assert.deepEqual(result, {
      ok: false,
      error: "You are not allowed to create accounts.",
    });
    assert.equal(createdUserBody, undefined);
  });

  it("allows the master admin while discarding attempted role escalation", async () => {
    session = { user: { role: "admin" } };
    const result = await action.createAccountAction({
      firstName: "Staff",
      lastName: "Member",
      email: "staff@example.invalid",
      password: "a-secure-test-password",
      role: "admin",
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(createdUserBody, {
      email: "staff@example.invalid",
      password: "a-secure-test-password",
      name: "Staff Member",
    });
    assert.equal(createdUserHeaders, requestHeaders);
  });

  it("validates account details before calling Better Auth", async () => {
    session = { user: { role: "admin" } };
    const result = await action.createAccountAction({
      firstName: "A",
      lastName: "Member",
      email: "not-an-email",
      password: "short",
    });

    assert.deepEqual(result, { ok: false, error: "Enter the first name." });
    assert.equal(createdUserBody, undefined);
  });
});
