/**
 * @file    tests/database/helpers.ts
 * @brief   Apply migrations with the Supabase CLI to an isolated PostgreSQL test database
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const executeFile = promisify(execFile);

export function readFixture(name: string): string {
  return readFileSync(resolve("tests/database/fixtures", name), "utf8");
}

export async function createTestDatabase(): Promise<PGlite> {
  const database = await PGlite.create();
  await database.exec(readFixture("auth.sql"));
  return database;
}

export async function applyMigrationsViaCli(database: PGlite): Promise<string> {
  const server = new PGLiteSocketServer({ db: database, port: 0 });
  await server.start();
  const databaseUrl = `postgresql://postgres:postgres@${server.getServerConn()}/postgres?sslmode=disable`;
  try {
    const { stdout, stderr } = await executeFile(process.execPath, [
      resolve("node_modules/supabase/dist/supabase.js"),
      "db", "push", "--db-url", databaseUrl, "--yes",
    ], { timeout: 60_000, env: { ...process.env, DO_NOT_TRACK: "1" } });
    return `${stdout}\n${stderr}`;
  } finally {
    await server.stop();
  }
}

export async function queryAsUser<T>(database: PGlite, userId: string, sql: string) {
  return database.transaction(async (transaction) => {
    await transaction.exec("set local role authenticated");
    await transaction.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    return transaction.query<T>(sql);
  });
}

export async function queryAsAnonymous(database: PGlite, sql: string) {
  return database.transaction(async (transaction) => {
    await transaction.exec("set local role anon");
    return transaction.query(sql);
  });
}
