/**
 * @file    tests/unit/models/cases.ts
 * @brief   Define typed CRUD scenarios for the seven non-secret data models
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import type { DatabaseClient } from "../../../lib/types/database";
import { ProfilesModel } from "../../../lib/models/profiles";
import { ProjectsModel } from "../../../lib/models/projects";
import { QaBatchesModel } from "../../../lib/models/qaBatches";
import { PrdPartsModel } from "../../../lib/models/prdParts";
import { PhasesModel } from "../../../lib/models/phases";
import { FeaturesModel } from "../../../lib/models/features";
import { ExportsModel } from "../../../lib/models/exports";

export const ownerId = "00000000-0000-0000-0000-000000000001";
export const projectId = "10000000-0000-0000-0000-000000000001";
export const recordId = "20000000-0000-0000-0000-000000000001";
export const times = { created_at: "2026-10-12T00:00:00Z", updated_at: "2026-10-12T00:00:00Z" };

type Scenario = {
  table: string; row: Record<string, unknown>; scopeField: string; scopeId: string; targetId?: string;
  create: (client: DatabaseClient) => Promise<unknown>;
  get: (client: DatabaseClient) => Promise<unknown>;
  update: (client: DatabaseClient) => Promise<unknown>;
  remove: (client: DatabaseClient) => Promise<boolean>;
  changed: Record<string, unknown>;
};

export const scenarios: Scenario[] = [
  {
    table: "profiles", scopeField: "id", scopeId: ownerId,
    row: { id: ownerId, email: "alice@example.test", display_name: "Alice", ...times },
    create: (client) => new ProfilesModel(client, ownerId).create({ display_name: "Alice" }),
    get: (client) => new ProfilesModel(client, ownerId).get(),
    update: (client) => new ProfilesModel(client, ownerId).update({ display_name: "Updated" }),
    remove: (client) => new ProfilesModel(client, ownerId).remove(), changed: { display_name: "Updated" },
  },
  {
    table: "projects", scopeField: "user_id", scopeId: ownerId, targetId: projectId,
    row: { id: projectId, user_id: ownerId, title: "Project", idea_raw: "a".repeat(50), language: "id",
      status: "drafting", deleted_at: null, ...times },
    create: (client) => new ProjectsModel(client, ownerId).create({ title: "Project", idea_raw: "a".repeat(50) }),
    get: (client) => new ProjectsModel(client, ownerId).get(projectId),
    update: (client) => new ProjectsModel(client, ownerId).update(projectId, { title: "Updated" }),
    remove: (client) => new ProjectsModel(client, ownerId).remove(projectId), changed: { title: "Updated" },
  },
  {
    table: "qa_batches", scopeField: "project_id", scopeId: projectId,
    row: { id: recordId, project_id: projectId, questions: ["1", "2", "3", "4", "5"], answers: [], ...times },
    create: (client) => new QaBatchesModel(client, projectId).create({ questions: ["1", "2", "3", "4", "5"] }),
    get: (client) => new QaBatchesModel(client, projectId).get(),
    update: (client) => new QaBatchesModel(client, projectId).update({ answers: ["Answer"] }),
    remove: (client) => new QaBatchesModel(client, projectId).remove(), changed: { answers: ["Answer"] },
  },
  {
    table: "prd_parts", scopeField: "project_id", scopeId: projectId,
    row: { id: recordId, project_id: projectId, part_a_md: null, part_a_json: null,
      summary_plain: "Summary", stack_choice: null, stack_detail: null, ...times },
    create: (client) => new PrdPartsModel(client, projectId).create({ summary_plain: "Summary" }),
    get: (client) => new PrdPartsModel(client, projectId).get(),
    update: (client) => new PrdPartsModel(client, projectId).update({ summary_plain: "Updated" }),
    remove: (client) => new PrdPartsModel(client, projectId).remove(), changed: { summary_plain: "Updated" },
  },
  {
    table: "phases", scopeField: "project_id", scopeId: projectId, targetId: recordId,
    row: { id: recordId, project_id: projectId, name: "MVP", sort: 0, is_done: false, ...times },
    create: (client) => new PhasesModel(client, projectId).create({ name: "MVP" }),
    get: (client) => new PhasesModel(client, projectId).get(recordId),
    update: (client) => new PhasesModel(client, projectId).update(recordId, { is_done: true }),
    remove: (client) => new PhasesModel(client, projectId).remove(recordId), changed: { is_done: true },
  },
  {
    table: "features", scopeField: "project_id", scopeId: projectId, targetId: recordId,
    row: { id: recordId, project_id: projectId, phase_id: recordId, title: "Feature", desc_plain: "Plain",
      desc_tech: "", priority: "P0", status: "draft", sort: 0, ...times },
    create: (client) => new FeaturesModel(client, projectId)
      .create({ phase_id: recordId, title: "Feature", desc_plain: "Plain", priority: "P0" }),
    get: (client) => new FeaturesModel(client, projectId).get(recordId),
    update: (client) => new FeaturesModel(client, projectId).update(recordId, { status: "approved" }),
    remove: (client) => new FeaturesModel(client, projectId).remove(recordId), changed: { status: "approved" },
  },
  {
    table: "exports", scopeField: "project_id", scopeId: projectId, targetId: recordId,
    row: { id: recordId, project_id: projectId, type: "md", content_text: "# PRD", file_path: null,
      created_at: times.created_at },
    create: (client) => new ExportsModel(client, projectId).create({ type: "md", content_text: "# PRD" }),
    get: (client) => new ExportsModel(client, projectId).get(recordId),
    update: (client) => new ExportsModel(client, projectId).update(recordId, { type: "pdf", file_path: "exports/test.pdf" }),
    remove: (client) => new ExportsModel(client, projectId).remove(recordId),
    changed: { type: "pdf", content_text: null, file_path: "exports/test.pdf" },
  },
];
