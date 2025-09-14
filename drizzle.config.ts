import { defineConfig } from "drizzle-kit";

// NOTE: This project uses MongoDB, not PostgreSQL/Drizzle
// This file is provided for potential future migration to PostgreSQL
// Currently unused - the app uses MongoDB with native driver

if (!process.env.DATABASE_URL) {
  throw new Error(`
    DATABASE_URL environment variable is not set.
    
    Note: This SocialConnect project currently uses MongoDB.
    If you want to use PostgreSQL with Drizzle, set DATABASE_URL and update the schema.
    
    Current MongoDB configuration is in shared/mongoConfig.ts
  `);
}

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});