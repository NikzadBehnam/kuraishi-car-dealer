import "server-only";

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { after } from "next/server";

import {
  sendPasswordResetEmail as deliverPasswordResetEmail,
  sendVerificationEmail as deliverVerificationEmail,
} from "@/lib/email/resend-auth-emails";
import { prisma } from "@/lib/prisma";

import {
  createKuraishiAuthOptions,
  localAuthOrigin,
  productionAuthOrigin,
} from "./options.ts";

export const auth = betterAuth(
  createKuraishiAuthOptions({
    backgroundTaskHandler: scheduleAfterResponse,
    baseURL: getBetterAuthBaseURL(),
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    emailDelivery: {
      sendPasswordResetEmail: async (input) => {
        scheduleAfterResponse(deliverPasswordResetEmail(input));
      },
      sendVerificationEmail: async (input) => {
        scheduleAfterResponse(deliverVerificationEmail(input));
      },
    },
    googleClientId: getRequiredServerEnv("GOOGLE_CLIENT_ID"),
    googleClientSecret: getRequiredServerEnv("GOOGLE_CLIENT_SECRET"),
    secret: getRequiredServerEnv("BETTER_AUTH_SECRET"),
    useSecureCookies: process.env.NODE_ENV === "production",
  }),
);

function scheduleAfterResponse(promise: Promise<unknown>) {
  after(() => promise);
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

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error(`${name} must use https in production.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name} must use http or https.`);
  }

  return url.origin;
}
