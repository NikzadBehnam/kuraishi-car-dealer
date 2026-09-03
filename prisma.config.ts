import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "pnpm seed:first-admin",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
