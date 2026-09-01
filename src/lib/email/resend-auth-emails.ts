import "server-only";

import { Resend } from "resend";

import {
  type AuthEmailKind,
  renderAuthEmail,
} from "@/lib/email/auth-email-templates";

type ResendEmails = Resend["emails"];
type ResendEmailPayload = Parameters<ResendEmails["send"]>[0];
type ResendEmailResult = Awaited<ReturnType<ResendEmails["send"]>>;

export type SendAuthEmailInput = {
  kind: AuthEmailKind;
  to: string;
  url: string;
  recipientName?: string | null;
};

export type SendAuthEmailResult = {
  id: string;
};

export type AuthEmailTransport = {
  send: (payload: ResendEmailPayload) => Promise<ResendEmailResult>;
};

export class AuthEmailDeliveryError extends Error {
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AuthEmailDeliveryError";
    this.cause = cause;
  }
}

let resend: Resend | null = null;

export async function sendAuthEmail(
  input: SendAuthEmailInput,
  transport = getAuthEmailTransport(),
): Promise<SendAuthEmailResult> {
  const config = getAuthEmailConfig();
  const email = renderAuthEmail(input.kind, {
    actionUrl: input.url,
    recipientName: input.recipientName,
  });
  const payload = {
    from: config.from,
    html: email.html,
    replyTo: config.replyTo,
    subject: email.subject,
    tags: [
      { name: "category", value: "auth" },
      { name: "kind", value: input.kind },
    ],
    text: email.text,
    to: input.to,
  } satisfies ResendEmailPayload;

  try {
    const result = await transport.send(payload);

    if (result.error) {
      throw new AuthEmailDeliveryError(
        "Auth email delivery failed.",
        sanitizeDeliveryError(result.error),
      );
    }

    return { id: result.data.id };
  } catch (error) {
    if (error instanceof AuthEmailDeliveryError) {
      throw error;
    }

    throw new AuthEmailDeliveryError(
      "Auth email delivery failed.",
      sanitizeDeliveryError(error),
    );
  }
}

export function sendVerificationEmail(input: Omit<SendAuthEmailInput, "kind">) {
  return sendAuthEmail({ ...input, kind: "verification" });
}

export function sendPasswordResetEmail(
  input: Omit<SendAuthEmailInput, "kind">,
) {
  return sendAuthEmail({ ...input, kind: "password-reset" });
}

function getAuthEmailTransport(): AuthEmailTransport {
  const config = getAuthEmailConfig();

  resend ??= new Resend(config.apiKey);

  return resend.emails;
}

function getAuthEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined;

  if (!apiKey || !from) {
    const missing = [
      !apiKey ? "RESEND_API_KEY" : null,
      !from ? "RESEND_FROM_EMAIL" : null,
    ].filter((key): key is string => key !== null);

    throw new AuthEmailDeliveryError(
      `Missing auth email configuration: ${missing.join(", ")}.`,
    );
  }

  return {
    apiKey,
    from,
    replyTo,
  };
}

function sanitizeDeliveryError(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const details: {
    name?: string;
    statusCode?: number | null;
  } = {};

  if ("name" in error && typeof error.name === "string") {
    details.name = error.name;
  }

  if (
    "statusCode" in error &&
    (typeof error.statusCode === "number" || error.statusCode === null)
  ) {
    details.statusCode = error.statusCode;
  }

  return Object.keys(details).length > 0 ? details : undefined;
}
