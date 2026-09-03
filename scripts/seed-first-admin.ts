import "dotenv/config";

import process from "node:process";

import { PrismaPg } from "@prisma/adapter-pg";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

import { PrismaClient } from "../src/generated/prisma/client.ts";
import {
  createKuraishiAuthOptions,
  localAuthOrigin,
} from "../src/lib/auth/options.ts";
import {
  classifyFirstAdminSeedState,
  getFirstAdminDisplayName,
  readFirstAdminSeedInput,
  type FirstAdminSeedInput,
} from "../src/lib/auth/first-admin-seed-policy.ts";
import { authRoles } from "../src/lib/auth/roles.ts";

async function main() {
  const inputResult = readFirstAdminSeedInput(process.env);

  if (!inputResult.ok) {
    printFailure("First ADMIN seed configuration is invalid.");
    for (const issue of inputResult.issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  const input = inputResult.input;
  const prisma = createSeedPrismaClient(input.databaseUrl);

  try {
    const existingUser = await findFirstAdminUser(prisma, input.email);
    const state = classifyFirstAdminSeedState(existingUser);

    if (state.action === "already-configured") {
      console.info(
        `First ADMIN account is already configured for ${input.email}; no changes made.`,
      );
      return;
    }

    if (state.action === "conflict") {
      printFailure(`Refusing to modify existing account for ${input.email}.`);
      for (const reason of state.reasons) {
        console.error(`- ${reason}`);
      }
      process.exitCode = 1;
      return;
    }

    await createFirstAdmin(prisma, input);

    const verifiedUser = await findFirstAdminUser(prisma, input.email);
    const verifiedState = classifyFirstAdminSeedState(verifiedUser);

    if (verifiedState.action !== "already-configured") {
      printFailure("First ADMIN account creation did not verify cleanly.");
      process.exitCode = 1;
      return;
    }

    console.info(`Created first ADMIN account for ${input.email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

function createSeedPrismaClient(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

async function createFirstAdmin(
  prisma: PrismaClient,
  input: FirstAdminSeedInput,
) {
  const auth = betterAuth(
    createKuraishiAuthOptions({
      baseURL: process.env.BETTER_AUTH_URL ?? localAuthOrigin,
      database: prismaAdapter(prisma, {
        provider: "postgresql",
      }),
      emailDelivery: {
        sendPasswordResetEmail: async () => {},
        sendVerificationEmail: async () => {},
      },
      googleClientId: process.env.GOOGLE_CLIENT_ID ?? "seed-google-client-id",
      googleClientSecret:
        process.env.GOOGLE_CLIENT_SECRET ?? "seed-google-client-secret",
      secret: input.secret,
      useSecureCookies: process.env.NODE_ENV === "production",
    }),
  );

  await auth.api.createUser({
    body: {
      data: {
        banned: false,
        banExpires: null,
        banReason: null,
        emailVerified: true,
        firstName: input.firstName,
        lastName: input.lastName,
      },
      email: input.email,
      name: getFirstAdminDisplayName(input),
      password: input.password,
      role: authRoles.admin,
    },
  });
}

async function findFirstAdminUser(prisma: PrismaClient, email: string) {
  return prisma.user.findUnique({
    select: {
      accounts: {
        select: {
          password: true,
          providerId: true,
        },
      },
      emailVerified: true,
      role: true,
    },
    where: {
      email,
    },
  });
}

function printFailure(message: string) {
  console.error(message);
}

main().catch((error: unknown) => {
  printFailure("First ADMIN seed failed.");

  if (error instanceof Error) {
    console.error(error.message);
  }

  process.exitCode = 1;
});
