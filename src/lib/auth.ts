import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import { prisma } from "@/lib/db";
import { ac, adminRole, userRole } from "@/lib/permissions";
import { getTrustedOrigins, isVercelPreview } from "@/lib/trusted-origins";

const isProduction = process.env.NODE_ENV === "production";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set.`);
  }

  return value;
}

const secret = requireEnv("BETTER_AUTH_SECRET");

if (secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long.");
}

const trustedOrigins = getTrustedOrigins(isProduction);
const baseURL = isVercelPreview()
  ? trustedOrigins[0]
  : requireEnv("BETTER_AUTH_URL");

if (!baseURL) {
  throw new Error(
    "Set BETTER_AUTH_URL to the exact HTTPS Preview origin, or to auto for the current Vercel Preview deployment.",
  );
}

if (isProduction && !baseURL.startsWith("https://")) {
  throw new Error("BETTER_AUTH_URL must use HTTPS in production.");
}

export const auth = betterAuth({
  secret,
  baseURL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
  },
  plugins: [
    admin({
      ac,
      roles: { admin: adminRole, user: userRole },
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    // Must stay last so cookies set from Server Actions are applied.
    nextCookies(),
  ],
  rateLimit: {
    // Counters in the database, because serverless instances do not share memory.
    storage: "database",
  },
  onAPIError: {
    onError(error) {
      if (!isAPIError(error) || error.statusCode >= 500) {
        console.error("Authentication request failed.");
      }
    },
  },
  advanced: {
    useSecureCookies: isProduction,
    ...(isProduction && {
      // Vercel sets this header itself; do not trust client-supplied forwarding headers.
      ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for"] },
    }),
  },
});
