import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { ZodError } from "zod";

import {
  InquiryIntakeError,
  inquirySubmissionSchema,
  inquiryTestModeEnabled,
  type InquirySubmission,
} from "./inquiry-validation.ts";
import { getTrustedOrigins } from "./trusted-origins.ts";

export const MAX_INQUIRY_BODY_BYTES = 16 * 1024;
type AcceptInquiry = (
  input: InquirySubmission,
  identity: { clientHash: string; payloadHash: string },
) => Promise<void>;

function response(body: object, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(status === 429 ? { "Retry-After": "900" } : {}),
    },
  });
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const declared = request.headers.get("content-length");
  if (declared !== null && !/^\d+$/.test(declared)) {
    throw new InquiryIntakeError(400, "Die Anfrage ist ungültig.");
  }
  if (declared !== null && Number(declared) > MAX_INQUIRY_BODY_BYTES) {
    throw new InquiryIntakeError(413, "Die Anfrage ist zu groß.");
  }
  if (!request.body) {
    throw new InquiryIntakeError(400, "Die Anfrage ist leer.");
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_INQUIRY_BODY_BYTES) {
        await reader.cancel();
        throw new InquiryIntakeError(413, "Die Anfrage ist zu groß.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      throw new InquiryIntakeError(400, "Die Anfrage enthält ungültige Daten.");
    }
    throw error;
  }
}

export async function handleInquiryRequest(
  request: Request,
  accept: AcceptInquiry,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<Response> {
  if (!inquiryTestModeEnabled(env)) {
    return response(
      { error: "Online-Anfragen sind derzeit nicht verfügbar." },
      503,
    );
  }
  try {
    const origins = getTrustedOrigins(env.NODE_ENV === "production");
    if (
      env.VERCEL === "1" &&
      env.VERCEL_ENV === "preview" &&
      env.VERCEL_URL &&
      /^[a-z0-9-]+\.vercel\.app$/.test(env.VERCEL_URL)
    ) {
      origins.push(`https://${env.VERCEL_URL}`);
    }
    if (!origins.includes(request.headers.get("origin") ?? "")) {
      return response({ error: "Nicht erlaubter Anfrageursprung." }, 403);
    }
    if (
      request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    ) {
      return response({ error: "Bitte senden Sie JSON-Daten." }, 415);
    }
    const secret = env.INQUIRY_HASH_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        "INQUIRY_HASH_SECRET must contain at least 32 characters.",
      );
    }
    let address: string;
    if (env.VERCEL === "1") {
      const forwarded = request.headers.get("x-vercel-forwarded-for")?.trim();
      const version = forwarded ? isIP(forwarded) : 0;
      if (!forwarded || !version) {
        throw new Error("A trusted single Vercel client address is required.");
      }
      address =
        version === 6 ? new URL(`http://[${forwarded}]`).hostname : forwarded;
    } else if (
      (env.NODE_ENV === "development" || env.NODE_ENV === "test") &&
      request.headers.get("origin") === "http://localhost:3000"
    ) {
      // Local requests share one conservative quota; arbitrary forwarded headers are never trusted.
      address = "local-development";
    } else {
      throw new Error(
        "Inquiry client-address trust is not configured for this deployment.",
      );
    }
    const input = inquirySubmissionSchema.parse(await readBoundedJson(request));
    if (!input.fields.email.toLowerCase().endsWith(".invalid")) {
      return response(
        {
          error:
            "Verwenden Sie im Testmodus eine fiktive E-Mail-Adresse, z. B. test@example.invalid.",
        },
        400,
      );
    }
    const hash = (value: string) =>
      createHmac("sha256", secret).update(value).digest("hex");
    const clientHash = hash(`client\0${address}`);
    const { phone, preferredDate, ...fields } = input.fields;
    const payloadHash = hash(
      `payload\0${clientHash}\0${JSON.stringify({
        fields: {
          ...fields,
          phone: phone || null,
          preferredDate: preferredDate || null,
        },
        vehicleSlug: input.vehicleSlug,
        privacyNoticeVersion: input.privacyNoticeVersion,
      })}`,
    );
    await accept(input, { clientHash, payloadHash });
    return response({ ok: true }, 202);
  } catch (error) {
    if (error instanceof ZodError) {
      return response(
        { error: error.issues[0]?.message ?? "Bitte prüfen Sie Ihre Angaben." },
        400,
      );
    }
    if (error instanceof InquiryIntakeError) {
      return response({ error: error.message }, error.status);
    }
    console.error("Inquiry submission failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return response(
      {
        error:
          "Ihre Anfrage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
      },
      503,
    );
  }
}
