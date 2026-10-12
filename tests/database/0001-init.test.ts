/**
 * @file    tests/database/0001-init.test.ts
 * @brief   Verify initial schema and per-user isolation using real PostgreSQL execution
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import {
  applyMigrationsViaCli, createTestDatabase, queryAsAnonymous, queryAsUser, readFixture,
} from "./helpers";
import {
  alice, alicePhase, aliceProject, bob, bobPhase, bobProject, insertForOtherOwner, tableFixtures,
} from "./table-fixtures";

const tables = [
  "exports", "features", "phases", "prd_parts", "profiles", "projects", "qa_batches", "user_keys",
];
let database: PGlite;

beforeAll(async () => {
  database = await createTestDatabase();
  await applyMigrationsViaCli(database);
}, 90_000);

afterAll(async () => {
  await database?.close();
});

beforeEach(async () => {
  await database.exec("truncate auth.users cascade");
  await database.exec(readFixture("projects.sql"));
});

describe("0001_init migration", () => {
  test("creates all eight application tables through the Supabase CLI", async () => {
    const result = await database.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' order by tablename",
    );
    expect(result.rows.map((row) => row.tablename)).toEqual(tables);
  });

  test("enables row-level security on every application table", async () => {
    const result = await database.query<{ tablename: string; rowsecurity: boolean }>(
      "select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename",
    );
    expect(result.rows).toEqual(tables.map((tablename) => ({ tablename, rowsecurity: true })));
  });
});

describe("migration indexes and replay", () => {
  test("indexes owner history and features sorted by phase", async () => {
    const result = await database.query<{ indexdef: string }>(
      "select indexdef from pg_indexes where schemaname = 'public'",
    );
    expect(result.rows.some(({ indexdef }) => indexdef.includes("(user_id, updated_at DESC)"))).toBe(true);
    expect(result.rows.some(({ indexdef }) => indexdef.includes("(phase_id, sort)"))).toBe(true);
  });

  test("records 0001 once and allows a second CLI push without replaying it", async () => {
    await applyMigrationsViaCli(database);
    const result = await database.query<{ version: string }>(
      "select version from supabase_migrations.schema_migrations order by version",
    );
    expect(result.rows).toEqual([{ version: "0001" }]);
  }, 90_000);
});

describe("owner-scoped CRUD", () => {
  test.each(tableFixtures)("$table exposes only each user's own row", async (fixture) => {
    const sql = `select ${fixture.primaryKey} as id from public.${fixture.table}`;
    const own = await queryAsUser<{ id: string }>(database, alice, sql);
    const other = await queryAsUser<{ id: string }>(database, bob, sql);
    expect(own.rows).toEqual([{ id: fixture.ownId }]);
    expect(other.rows).toEqual([{ id: fixture.otherId }]);
  });

  test.each(tableFixtures)("$table allows owner update, delete, and insert", async (fixture) => {
    const sql = `update public.${fixture.table} set ${fixture.primaryKey} = ${fixture.primaryKey}
      returning ${fixture.primaryKey} as id`;
    expect((await queryAsUser(database, alice, sql)).rows).toEqual([{ id: fixture.ownId }]);
    const deletion = await queryAsUser(database, alice,
      `delete from public.${fixture.table} returning ${fixture.primaryKey} as id`);
    expect(deletion.rows).toEqual([{ id: fixture.ownId }]);
    await queryAsUser(database, alice, fixture.insert);
    const restored = await queryAsUser(database, alice,
      `select ${fixture.primaryKey} as id from public.${fixture.table}`);
    expect(restored.rows).toEqual([{ id: fixture.ownId }]);
  });
});

describe("cross-owner and anonymous access", () => {
  test.each(tableFixtures)("$table rejects inserting data for another owner", async (fixture) => {
    await expect(queryAsUser(database, alice, insertForOtherOwner(fixture)))
      .rejects.toMatchObject({ code: "42501" });
  });

  test.each(tableFixtures)("$table prevents update and delete of another owner's row", async (fixture) => {
    const condition = `${fixture.primaryKey} = '${fixture.otherId}'`;
    const update = await queryAsUser(database, alice,
      `update public.${fixture.table} set ${fixture.primaryKey} = ${fixture.primaryKey}
        where ${condition} returning ${fixture.primaryKey}`);
    const deletion = await queryAsUser(database, alice,
      `delete from public.${fixture.table} where ${condition} returning ${fixture.primaryKey}`);
    expect(update.rows).toEqual([]);
    expect(deletion.rows).toEqual([]);
    expect((await database.query(`select 1 from public.${fixture.table} where ${condition}`)).rows).toHaveLength(1);
  });

  test.each(tableFixtures)("$table denies anonymous access", async (fixture) => {
    await expect(queryAsAnonymous(database, `select * from public.${fixture.table}`))
      .rejects.toMatchObject({ code: "42501" });
    await expect(queryAsAnonymous(database, fixture.insert))
      .rejects.toMatchObject({ code: "42501" });
  });
});

describe("ownership and reparenting constraints", () => {
  test("does not transfer a project to another owner", async () => {
    await expect(queryAsUser(database, alice,
      `update public.projects set user_id = '${bob}' where id = '${aliceProject}'`))
      .rejects.toMatchObject({ code: "42501" });
  });

  test("does not reparent features or documents into another owner's project", async () => {
    await expect(queryAsUser(database, alice,
      `update public.features set project_id = '${bobProject}', phase_id = '${bobPhase}'`))
      .rejects.toMatchObject({ code: "42501" });
    await expect(queryAsUser(database, alice,
      `update public.prd_parts set project_id = '${bobProject}'`))
      .rejects.toMatchObject({ code: "42501" });
  });

  test("rejects a feature whose phase belongs to a different project", async () => {
    await expect(queryAsUser(database, alice,
      `update public.features set phase_id = '${bobPhase}'`))
      .rejects.toMatchObject({ code: "23503" });
  });
});

describe("profile creation and field validation", () => {
  test("creates the auth user's profile automatically", async () => {
    const result = await queryAsUser(database, alice,
      "select email, display_name from public.profiles");
    expect(result.rows).toEqual([{ email: "alice@example.test", display_name: "Alice" }]);
  });

  test.each([
    ["language", "'invalid'"], ["status", "'invalid'"], ["idea_raw", "'short'"], ["title", "' '"],
  ])("rejects invalid project %s", async (column, value) => {
    await expect(queryAsUser(database, alice, `update public.projects set ${column} = ${value}`))
      .rejects.toMatchObject({ code: "23514" });
  });

  test.each([
    ["priority", "'P9'"], ["status", "'invalid'"], ["desc_plain", "' '"], ["sort", "-1"],
  ])("rejects invalid feature %s", async (column, value) => {
    await expect(queryAsUser(database, alice, `update public.features set ${column} = ${value}`))
      .rejects.toMatchObject({ code: "23514" });
  });
});

describe("phase and document uniqueness", () => {
  test("rejects an unsupported phase name", async () => {
    await expect(queryAsUser(database, alice, "update public.phases set name = 'Other'"))
      .rejects.toMatchObject({ code: "23514" });
  });

  test("keeps only one Q&A batch and one Part A record per project", async () => {
    await expect(queryAsUser(database, alice,
      `insert into public.qa_batches (project_id, questions) values ('${aliceProject}', '["1","2","3","4","5"]')`))
      .rejects.toMatchObject({ code: "23505" });
    await expect(queryAsUser(database, alice,
      `insert into public.prd_parts (project_id) values ('${aliceProject}')`))
      .rejects.toMatchObject({ code: "23505" });
  });

  test("keeps each phase name unique within a project", async () => {
    await expect(queryAsUser(database, alice,
      `insert into public.phases (project_id, name) values ('${aliceProject}', 'MVP')`))
      .rejects.toMatchObject({ code: "23505" });
  });

  test("requires between five and eight questions", async () => {
    await expect(queryAsUser(database, alice,
      "update public.qa_batches set questions = '[\"Only one\"]'::jsonb"))
      .rejects.toMatchObject({ code: "23514" });
  });
});

describe("export snapshots and project history", () => {
  test("separates Markdown snapshots from PDF storage paths", async () => {
    await expect(queryAsUser(database, alice,
      "update public.exports set type = 'pdf'"))
      .rejects.toMatchObject({ code: "23514" });
    await queryAsUser(database, alice,
      "update public.exports set type = 'pdf', content_text = null, file_path = 'exports/test.pdf'");
  });

  test("retains a soft-deleted project's documents", async () => {
    await queryAsUser(database, alice, "update public.projects set deleted_at = now()");
    expect((await queryAsUser(database, alice, "select * from public.prd_parts")).rows).toHaveLength(1);
  });

  test("updates project timestamps when its content changes", async () => {
    const before = await queryAsUser<{ original: boolean }>(database, alice,
      "select updated_at < '2001-01-01' as original from public.projects");
    expect(before.rows).toEqual([{ original: true }]);
    const result = await queryAsUser<{ refreshed: boolean }>(database, alice,
      "update public.projects set title = 'Updated' returning updated_at > '2001-01-01' as refreshed");
    expect(result.rows).toEqual([{ refreshed: true }]);
  });
});

describe("relationship lifecycle", () => {
  test("cascades hard deletion from auth user to all owned data", async () => {
    await database.exec(`delete from auth.users where id = '${alice}'`);
    for (const { table } of tableFixtures) {
      expect((await database.query(`select * from public.${table}`)).rows).toHaveLength(1);
    }
  });

  test("allows moving a feature to another phase within its own project", async () => {
    await queryAsUser(database, alice,
      `insert into public.phases (project_id, name) values ('${aliceProject}', 'V1')`);
    await queryAsUser(database, alice,
      `update public.features set phase_id = (select id from public.phases where name = 'V1')
        where phase_id = '${alicePhase}'`);
  });
});
