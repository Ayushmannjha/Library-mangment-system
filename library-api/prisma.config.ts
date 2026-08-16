// Prisma 7 CLI config.
// `import "dotenv/config"` loads .env so the CLI can resolve DATABASE_URL —
// without it, generate/db commands would fail because the env var is missing.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Migrations dir is declared even while we currently use `prisma db push`,
  // so switching to formal migrations later requires no config change.
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // URL is read from the environment (never hard-coded / committed).
    url: process.env["DATABASE_URL"],
  },
});