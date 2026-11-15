import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// The Prisma CLI does not load Next.js env files, so load the local one explicitly.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Direct (non-pooled) connection for migrations; the app uses DATABASE_URL at runtime.
    url: process.env.DIRECT_URL ?? "",
  },
});
