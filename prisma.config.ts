// This file is used only by the Prisma CLI, not by the application runtime.
// Disable TypeScript checking here to avoid Next.js build errors about "prisma/config".
// @ts-nocheck
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
