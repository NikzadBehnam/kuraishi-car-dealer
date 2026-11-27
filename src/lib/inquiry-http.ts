import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { ZodError } from "zod";

import {
  InquiryIntakeError,
  inquirySubmissionSchema,
  type InquirySubmission,
} from "./inquiry-validation.ts";
import {
  getInquiryIntakePolicy,
  type EnabledInquiryIntakeMode,
} from "./inquiry-intake-policy.ts";

export const MAX_INQUIRY_BODY_BYTES = 16 * 1024;
type AcceptInquiry = (
  input: InquirySubmission,
  identity: { clientHash: string; payloadHash: string },
  mode: EnabledInquiryIntakeMode,
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
  const policy = getInquiryIntakePolicy(request.headers.get("host"), env);
  if (policy.mode === "off") {
    return response(
      { error: "Online-Anfragen sind derzeit nicht verfügbar." },
      503,
    );
  }
  try {
    if (request.headers.get("origin") !== policy.origin) {
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
    let address: string;
    if (env.VERCEL === "1") {
      const forwarded = request.headers.get("x-vercel-forwarded-for")?.trim();
      const version = forwarded ? isIP(forwarded) : 0;
      if (!forwarded || !version) {
        throw new Error("A trusted single Vercel client address is required.");
      }
      address =
        version === 6 ? new URL(`http://[${forwarded}]`).hostname : forwarded;
    } else {
      // Local requests share one conservative quota; arbitrary forwarded headers are never trusted.
      address = "local-development";
    }
    const input = inquirySubmissionSchema.parse(await readBoundedJson(request));
    if (
      policy.mode === "synthetic" &&
      !input.fields.email.toLowerCase().endsWith(".invalid")
    ) {
      return response(
        {
          error:
            "Verwenden Sie im Testmodus eine fiktive E-Mail-Adresse, z. B. test@example.invalid.",
        },
        400,
      );
    }
    const hash = (value: string) =>
      createHmac("sha256", policy.secret).update(value).digest("hex");
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
        serviceTopic: input.serviceTopic,
      })}`,
    );
    await accept(input, { clientHash, payloadHash }, policy.mode);
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
