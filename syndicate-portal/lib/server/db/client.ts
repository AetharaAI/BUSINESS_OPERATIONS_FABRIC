import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { serverEnv } from "@/lib/server/env";
import * as schema from "@/lib/server/db/schema";

declare global {
  // eslint-disable-next-line no-var
  var __bofPgPool: Pool | undefined;
  var __bofPgDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

export const crmSql = sql;

export const getCrmPool = (): Pool => {
  if (!serverEnv.crmDatabaseUrl) {
    throw new Error("CRM_DATABASE_URL is required for BOF CRM data-plane access");
  }

  if (global.__bofPgPool) {
    return global.__bofPgPool;
  }

  const pool = new Pool({
    connectionString: serverEnv.crmDatabaseUrl,
    max: 10
  });

  if (process.env.NODE_ENV !== "production") {
    global.__bofPgPool = pool;
  }

  return pool;
};

export const getCrmDb = () => {
  if (global.__bofPgDb) {
    return global.__bofPgDb;
  }

  const db = drizzle(getCrmPool(), { schema });
  if (process.env.NODE_ENV !== "production") {
    global.__bofPgDb = db;
  }

  return db;
};
