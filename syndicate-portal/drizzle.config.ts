import { defineConfig } from "drizzle-kit";

if (!process.env.CRM_DATABASE_URL) {
  throw new Error("CRM_DATABASE_URL is required for Drizzle migrations");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.CRM_DATABASE_URL
  }
});
