import "dotenv/config";
import { defineConfig } from "prisma/config";

// The Prisma CLI (migrate, studio) uses the DIRECT connection.
// The app at runtime uses DATABASE_URL (Supabase pooler) via the pg adapter.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
