/**
 * @file    tests/database/table-fixtures.ts
 * @brief   Define owner-scoped records for CRUD and cross-user RLS tests
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
export const alice = "00000000-0000-0000-0000-000000000001";
export const bob = "00000000-0000-0000-0000-000000000002";
export const aliceProject = "10000000-0000-0000-0000-000000000001";
export const bobProject = "10000000-0000-0000-0000-000000000002";
export const alicePhase = "20000000-0000-0000-0000-000000000001";
export const bobPhase = "20000000-0000-0000-0000-000000000002";

export const tableFixtures = [
  {
    table: "profiles", primaryKey: "id", ownId: alice, otherId: bob,
    insert: `insert into public.profiles (id, email) values ('${alice}', 'alice@example.test')`,
  },
  {
    table: "projects", primaryKey: "id", ownId: aliceProject, otherId: bobProject,
    insert: `insert into public.projects (id, user_id, title, idea_raw)
      values ('${aliceProject}', '${alice}', 'Alice project', repeat('a', 50))`,
  },
  {
    table: "qa_batches", primaryKey: "id",
    ownId: "50000000-0000-0000-0000-000000000001", otherId: "50000000-0000-0000-0000-000000000002",
    insert: `insert into public.qa_batches (id, project_id, questions)
      values ('50000000-0000-0000-0000-000000000001', '${aliceProject}', '["Who?","Why?","What?","When?","Limits?"]')`,
  },
  {
    table: "prd_parts", primaryKey: "id",
    ownId: "60000000-0000-0000-0000-000000000001", otherId: "60000000-0000-0000-0000-000000000002",
    insert: `insert into public.prd_parts (id, project_id)
      values ('60000000-0000-0000-0000-000000000001', '${aliceProject}')`,
  },
  {
    table: "phases", primaryKey: "id", ownId: alicePhase, otherId: bobPhase,
    insert: `insert into public.phases (id, project_id, name) values ('${alicePhase}', '${aliceProject}', 'MVP')`,
  },
  {
    table: "features", primaryKey: "id",
    ownId: "30000000-0000-0000-0000-000000000001", otherId: "30000000-0000-0000-0000-000000000002",
    insert: `insert into public.features (id, phase_id, project_id, title, desc_plain, priority)
      values ('30000000-0000-0000-0000-000000000001', '${alicePhase}', '${aliceProject}', 'Alice feature', 'Explain the feature', 'P0')`,
  },
  {
    table: "exports", primaryKey: "id",
    ownId: "40000000-0000-0000-0000-000000000001", otherId: "40000000-0000-0000-0000-000000000002",
    insert: `insert into public.exports (id, project_id, type, content_text)
      values ('40000000-0000-0000-0000-000000000001', '${aliceProject}', 'md', '# Alice PRD')`,
  },
  {
    table: "user_keys", primaryKey: "user_id", ownId: alice, otherId: bob,
    insert: `insert into public.user_keys (user_id, provider, key_enc) values ('${alice}', 'openai', 'fixture-ciphertext')`,
  },
];

export function insertForOtherOwner(fixture: typeof tableFixtures[number]): string {
  return fixture.insert
    .replaceAll(fixture.ownId, fixture.otherId)
    .replaceAll(aliceProject, bobProject)
    .replaceAll(alicePhase, bobPhase)
    .replaceAll(alice, bob);
}
