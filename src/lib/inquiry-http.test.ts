import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it, mock } from "node:test";

import { inquiryPrivacyNotice } from "../content/de/inquiry-privacy.ts";
import {
  handleInquiryRequest,
  MAX_INQUIRY_BODY_BYTES,
} from "./inquiry-http.ts";
import {
  InquiryIntakeError,
  type InquirySubmission,
} from "./inquiry-validation.ts";

const localEnv = {
  NODE_ENV: "test",
  INQUIRY_TEST_MODE: "true",
  INQUIRY_HASH_SECRET: "synthetic-test-secret-not-for-deployment-12345",
};
const input: InquirySubmission = {
  fields: {
    name: "Synthetic Visitor",
    email: "visitor@example.invalid",
    appointmentType: "Beratung",
    message: "Synthetic inquiry.",
    consent: true,
  },
  requestId: randomUUID(),
  vehicleSlug: null,
  website: "",
  privacyNoticeVersion: inquiryPrivacyNotice.version,
};

function request(
  body = JSON.stringify(input),
  headers: Record<string, string> = {},
) {
  return new Request("http://localhost:3000/api/inquiries", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body,
  });
}

describe("inquiry HTTP boundary", () => {
  it("keeps intake off by default and cannot enable Production through the test flag", async () => {
    for (const env of [
      {},
      { ...localEnv, INQUIRY_TEST_MODE: "false" },
      { ...localEnv, NODE_ENV: "production" },
      { ...localEnv, VERCEL: "1", VERCEL_ENV: "production" },
      {
        ...localEnv,
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "production",
      },
    ]) {
      const result = await handleInquiryRequest(
        request(),
        async () => assert.fail("Must not accept."),
        env,
      );
      assert.equal(result.status, 503);
      assert.equal(result.headers.get("cache-control"), "no-store");
    }
  });

  it("requires a trusted origin, JSON, consent, an empty honeypot and strict fields", async () => {
    const accept = async () =>
      assert.fail("Invalid requests must not reach persistence.");
    assert.equal(
      (
        await handleInquiryRequest(
          request(undefined, { origin: "https://attacker.example" }),
          accept,
          localEnv,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await handleInquiryRequest(
          request(undefined, { "content-type": "text/plain" }),
          accept,
          localEnv,
        )
      ).status,
      415,
    );
    for (const body of [
      "{",
      JSON.stringify({ ...input, website: "https://bot.example" }),
      JSON.stringify({ ...input, fields: { ...input.fields, consent: false } }),
      JSON.stringify({
        ...input,
        fields: { ...input.fields, source: "callback" },
      }),
      JSON.stringify({ ...input, vehicleId: "forged" }),
      JSON.stringify({ ...input, vehicleSlug: "../private" }),
      JSON.stringify({
        ...input,
        fields: { ...input.fields, preferredDate: "2029-02-29" },
      }),
    ]) {
      assert.equal(
        (await handleInquiryRequest(request(body), accept, localEnv)).status,
        400,
      );
    }
    const invalidUtf8 = new Request("http://localhost:3000/api/inquiries", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: new Uint8Array([0xff]),
    });
    assert.equal(
      (await handleInquiryRequest(invalidUtf8, accept, localEnv)).status,
      400,
    );
  });

  it("enforces the actual byte limit even with an absent or forged content length", async () => {
    let accepted = 0;
    const accept = async () => {
      accepted++;
    };
    const json = JSON.stringify(input);
    const boundary =
      json + " ".repeat(MAX_INQUIRY_BODY_BYTES - Buffer.byteLength(json));
    assert.equal(
      (await handleInquiryRequest(request(boundary), accept, localEnv)).status,
      202,
    );
    const headerCases: Record<string, string>[] = [
      {},
      { "content-length": "1" },
    ];
    for (const headers of headerCases) {
      assert.equal(
        (
          await handleInquiryRequest(
            request(boundary + " ", headers),
            accept,
            localEnv,
          )
        ).status,
        413,
      );
    }
    assert.equal(
      (
        await handleInquiryRequest(
          request(json, {
            "content-length": String(MAX_INQUIRY_BODY_BYTES + 1),
          }),
          accept,
          localEnv,
        )
      ).status,
      413,
    );
    assert.equal(accepted, 1);
  });

  it("uses only hashed trusted identities and returns success only after durable acceptance", async () => {
    const identities: { clientHash: string; payloadHash: string }[] = [];
    const accept = async (
      _input: InquirySubmission,
      identity: { clientHash: string; payloadHash: string },
    ) => {
      identities.push(identity);
    };
    for (const ip of ["192.0.2.1", "198.51.100.1"]) {
      const result = await handleInquiryRequest(
        request(undefined, {
          "x-vercel-forwarded-for": ip,
          "x-forwarded-for": ip,
        }),
        accept,
        localEnv,
      );
      assert.equal(result.status, 202);
      assert.deepEqual(await result.json(), { ok: true });
    }
    assert.deepEqual(
      identities[0],
      identities[1],
      "Local spoofed forwarding headers must not change the shared quota.",
    );
    assert.match(identities[0].clientHash, /^[0-9a-f]{64}$/);
    assert.match(identities[0].payloadHash, /^[0-9a-f]{64}$/);
    assert.notEqual(identities[0].clientHash, identities[0].payloadHash);

    await handleInquiryRequest(
      request(
        JSON.stringify({
          ...input,
          fields: { ...input.fields, message: "Edited inquiry." },
        }),
      ),
      accept,
      localEnv,
    );
    assert.notEqual(identities[2].payloadHash, identities[0].payloadHash);
    assert.equal(identities[2].clientHash, identities[0].clientHash);
  });

  it("allows only the current Vercel Preview origin and a single platform client address", async () => {
    const env = {
      ...localEnv,
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_URL: "synthetic-preview.vercel.app",
    };
    const accept = async () => {};
    const headers = {
      origin: "https://synthetic-preview.vercel.app",
      "x-vercel-forwarded-for": "2001:db8::1",
    };
    assert.equal(
      (await handleInquiryRequest(request(undefined, headers), accept, env))
        .status,
      202,
    );
    assert.equal(
      (
        await handleInquiryRequest(
          request(undefined, {
            ...headers,
            origin: "https://other-preview.vercel.app",
          }),
          accept,
          env,
        )
      ).status,
      403,
    );
    const logging = mock.method(console, "error", () => {});
    try {
      for (const address of ["", "not-an-ip", "192.0.2.1, 198.51.100.1"]) {
        assert.equal(
          (
            await handleInquiryRequest(
              request(undefined, {
                ...headers,
                "x-vercel-forwarded-for": address,
              }),
              accept,
              env,
            )
          ).status,
          503,
        );
      }
    } finally {
      logging.mock.restore();
    }
  });

  it("surfaces quota, stale-context and database failures without leaking submitted data", async () => {
    for (const status of [409, 429] as const) {
      const result = await handleInquiryRequest(
        request(),
        async () => {
          throw new InquiryIntakeError(status, "Synthetic refusal.");
        },
        localEnv,
      );
      assert.equal(result.status, status);
      assert.deepEqual(await result.json(), { error: "Synthetic refusal." });
      assert.equal(
        result.headers.get("retry-after"),
        status === 429 ? "900" : null,
      );
    }
    const logging = mock.method(console, "error", () => {});
    try {
      const result = await handleInquiryRequest(
        request(),
        async () => {
          throw new Error(
            "Do not disclose visitor@example.invalid or connection details.",
          );
        },
        localEnv,
      );
      assert.equal(result.status, 503);
      assert.equal(
        (await result.text()).includes("visitor@example.invalid"),
        false,
      );
      assert.equal(
        JSON.stringify(logging.mock.calls).includes("visitor@example.invalid"),
        false,
      );
      assert.equal(logging.mock.callCount(), 1);
    } finally {
      logging.mock.restore();
    }
  });
});
