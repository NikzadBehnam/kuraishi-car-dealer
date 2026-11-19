import { z } from "zod";

import { inquiryTestModeEnabled } from "./inquiry-validation.ts";

const senderDomain = "notifications.kuraishi-autohandel.at";
const testRecipient = "delivered@resend.dev";
const senderSchema = z
  .email()
  .max(254)
  .refine((value) => value.split("@")[1]?.toLowerCase() === senderDomain);

export type InquiryEmailConfig =
  | { mode: "disabled" }
  | {
      mode: "test";
      provider: "resend";
      apiKey: string;
      from: string;
      to: [typeof testRecipient];
      inboxOrigin: string;
    };

export function parseInquiryEmailConfig(
  env: Readonly<Record<string, string | undefined>>,
): InquiryEmailConfig {
  const mode = env.INQUIRY_EMAIL_MODE ?? "disabled";
  if (mode === "disabled") return { mode };
  if (mode !== "test") {
    throw new Error(
      "INQUIRY_EMAIL_MODE supports only disabled or test; live delivery is not enabled.",
    );
  }
  if (!inquiryTestModeEnabled(env)) {
    throw new Error(
      "Inquiry email test mode requires enabled isolated inquiry test intake and cannot run in Production.",
    );
  }
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey || !/^re_[a-zA-Z0-9_-]+$/.test(apiKey)) {
    throw new Error("RESEND_API_KEY must contain a Resend API key.");
  }
  const from = senderSchema.safeParse(env.INQUIRY_EMAIL_FROM);
  if (!from.success) {
    throw new Error(
      `INQUIRY_EMAIL_FROM must be a plain mailbox at ${senderDomain}.`,
    );
  }
  if (env.INQUIRY_EMAIL_TO !== testRecipient) {
    throw new Error(
      `INQUIRY_EMAIL_TO must be ${testRecipient} in test mode; real recipients are not enabled.`,
    );
  }
  const expectedOrigin =
    env.VERCEL === "1"
      ? env.VERCEL_ENV === "preview" &&
        env.VERCEL_URL &&
        /^[a-z0-9-]+\.vercel\.app$/.test(env.VERCEL_URL)
        ? `https://${env.VERCEL_URL}`
        : null
      : env.NODE_ENV === "development" || env.NODE_ENV === "test"
        ? "http://localhost:3000"
        : null;
  if (!expectedOrigin || env.INQUIRY_EMAIL_INBOX_ORIGIN !== expectedOrigin) {
    throw new Error(
      "INQUIRY_EMAIL_INBOX_ORIGIN must be the exact localhost:3000 or current Vercel Preview origin, without a trailing slash.",
    );
  }
  return {
    mode,
    provider: "resend",
    apiKey,
    from: from.data,
    to: [testRecipient],
    inboxOrigin: expectedOrigin,
  };
}
