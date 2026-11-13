import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { admin } from "better-auth/plugins";

import { prisma } from "@/lib/db";
import { ac, adminRole, userRole } from "@/lib/permissions";

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

if (isProduction && !baseURL.startsWith("https://")) {
  throw new Error("BETTER_AUTH_URL must use HTTPS in production.");
}

export const auth = betterAuth({
  secret,
  baseURL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Exact origins only; localhost is trusted outside production.
  trustedOrigins: [
    "https://www.kuraishicars.com",
    ...(isProduction ? [] : ["http://localhost:3000"]),
  ],
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
