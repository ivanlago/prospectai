import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let pool: Pool | undefined;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL ausente");
    pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 8000, statement_timeout: 10000 });
    pool.on("error", () => console.error({ event: "database.pool_error" }));
  }
  return pool;
}

export function getDb() {
  return drizzle(getPool());
}
