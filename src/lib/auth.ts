import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
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

const baseURL = requireEnv("BETTER_AUTH_URL");
const trustedOrigins = getTrustedOrigins(isProduction);

if (isProduction && !baseURL.startsWith("https://")) {
  throw new Error("BETTER_AUTH_URL must use HTTPS in production.");
}

if (isVercelPreview() && trustedOrigins.length === 0) {
  throw new Error(
    "BETTER_AUTH_URL must be an exact HTTPS Vercel Preview origin without a trailing slash.",
  );
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
  advanced: {
    useSecureCookies: isProduction,
    ...(isProduction && {
      // Vercel sets this header itself; do not trust client-supplied forwarding headers.
      ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for"] },
    }),
  },
});
