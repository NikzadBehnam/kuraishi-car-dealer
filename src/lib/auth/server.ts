import "server-only";

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { after } from "next/server";

import {
  AuthEmailDeliveryError,
  sendPasswordResetEmail as deliverPasswordResetEmail,
  sendVerificationEmail as deliverVerificationEmail,
} from "@/lib/email/resend-auth-emails";
import { prisma } from "@/lib/prisma";

import {
  createKuraishiAuthOptions,
  localAuthOrigin,
  productionAuthOrigin,
} from "./options.ts";

const betterAuthBaseURL = getBetterAuthBaseURL();

export const auth = betterAuth(
  createKuraishiAuthOptions({
    backgroundTaskHandler: scheduleAfterResponse,
    baseURL: betterAuthBaseURL,
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    emailDelivery: {
      sendPasswordResetEmail: async (input) => {
        await deliverAuthEmail("password-reset", () =>
          deliverPasswordResetEmail(input),
        );
      },
      sendVerificationEmail: async (input) => {
        await deliverAuthEmail("verification", () =>
          deliverVerificationEmail(input),
        );
      },
    },
    googleClientId: getRequiredServerEnv("GOOGLE_CLIENT_ID"),
    googleClientSecret: getRequiredServerEnv("GOOGLE_CLIENT_SECRET"),
    secret: getRequiredServerEnv("BETTER_AUTH_SECRET"),
    useSecureCookies: shouldUseSecureCookies(betterAuthBaseURL),
  }),
);

function scheduleAfterResponse(promise: Promise<unknown>) {
  after(() => promise);
}

async function deliverAuthEmail(
  kind: "password-reset" | "verification",
  task: () => Promise<unknown>,
) {
  if (process.env.NODE_ENV === "development") {
    await runAuthEmailDelivery(kind, task);
    return;
  }

  scheduleAuthEmailDelivery(kind, task);
}

function scheduleAuthEmailDelivery(
  kind: "password-reset" | "verification",
  task: () => Promise<unknown>,
) {
  after(() => runAuthEmailDelivery(kind, task));
}

async function runAuthEmailDelivery(
  kind: "password-reset" | "verification",
  task: () => Promise<unknown>,
) {
  try {
    const result = await task();

    if (process.env.NODE_ENV === "development") {
      console.info("Auth email accepted.", {
        idPresent: hasEmailDeliveryId(result),
        kind,
      });
    }
  } catch (error) {
    console.error(
      "Auth email delivery failed.",
      getSafeEmailDeliveryErrorMetadata(kind, error),
    );
  }
}

function hasEmailDeliveryId(result: unknown) {
  return (
    result !== null &&
    typeof result === "object" &&
    "id" in result &&
    typeof result.id === "string" &&
    result.id.length > 0
  );
}

function getSafeEmailDeliveryErrorMetadata(
  kind: "password-reset" | "verification",
  error: unknown,
) {
  const metadata: {
    kind: "password-reset" | "verification";
    name?: string;
    statusCode?: number | null;
  } = { kind };

  const cause =
    error instanceof AuthEmailDeliveryError ? error.cause : undefined;
  const source = cause && typeof cause === "object" ? cause : error;

  if (source instanceof Error) {
    metadata.name = source.name;
  } else if (
    source &&
    typeof source === "object" &&
    "name" in source &&
    typeof source.name === "string"
  ) {
    metadata.name = source.name;
  }

  if (
    source &&
    typeof source === "object" &&
    "statusCode" in source &&
    (typeof source.statusCode === "number" || source.statusCode === null)
  ) {
    metadata.statusCode = source.statusCode;
  }

  return metadata;
}

function getBetterAuthBaseURL() {
  const configuredURL = process.env.BETTER_AUTH_URL?.trim();
  const fallbackURL =
    process.env.NODE_ENV === "production"
      ? productionAuthOrigin
      : localAuthOrigin;

  return normalizeAuthOrigin(configuredURL || fallbackURL, "BETTER_AUTH_URL");
}

function getRequiredServerEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not set.`);
  }

  return value;
}

function normalizeAuthOrigin(value: string, name: string) {
  const url = new URL(value);
  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

  if (
    process.env.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    !isLocalhost
  ) {
    throw new Error(`${name} must use https in production.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name} must use http or https.`);
  }

  return url.origin;
}

function shouldUseSecureCookies(baseURL: string) {
  return new URL(baseURL).protocol === "https:";
}
