/**
 * @file    tests/unit/models/models.test.ts
 * @brief   Verify CRUD results, immutable scopes, soft deletion, and safe database failures
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import { describe, expect, test } from "vitest";
import { FeaturesModel } from "../../../lib/models/features";
import { PhasesModel } from "../../../lib/models/phases";
import { ProjectsModel } from "../../../lib/models/projects";
import { ExportsModel } from "../../../lib/models/exports";
import { createHttpHarness } from "./http-harness";
import { ownerId, projectId, recordId, scenarios } from "./cases";

describe("model creation", () => {
  test.each(scenarios)("$table binds its parent scope when creating", async (scenario) => {
    const { client, requests } = createHttpHarness(scenario.row);
    expect(await scenario.create(client)).toEqual(scenario.row);
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    expect(requests[0].url.pathname).toBe(`/rest/v1/${scenario.table}`);
    expect(requests[0].body?.[scenario.scopeField]).toBe(scenario.scopeId);
  });

  test("ignores injected owner and database-generated fields", async () => {
    const { client, requests } = createHttpHarness(scenarios[1].row);
    const input = { title: "Project", idea_raw: "a".repeat(50), user_id: "other", id: "other", deleted_at: "now" };
    await new ProjectsModel(client, ownerId).create(input);
    expect(requests[0].body).toEqual({ user_id: ownerId, title: "Project", idea_raw: "a".repeat(50) });
  });
});

describe("model reads", () => {
  test.each(scenarios)("$table reads only within its bound scope", async (scenario) => {
    const { client, requests } = createHttpHarness(scenario.row);
    expect(await scenario.get(client)).toEqual(scenario.row);
    expect(requests[0].method).toBe("GET");
    expect(requests[0].url.searchParams.get(scenario.scopeField)).toBe(`eq.${scenario.scopeId}`);
    if (scenario.targetId) expect(requests[0].url.searchParams.get("id")).toBe(`eq.${scenario.targetId}`);
  });

  test.each(scenarios)("$table returns null for an absent or invisible row", async (scenario) => {
    const { client } = createHttpHarness(null);
    expect(await scenario.get(client)).toBeNull();
  });
});

describe("model updates", () => {
  test.each(scenarios)("$table updates permitted fields within its scope", async (scenario) => {
    const expected = { ...scenario.row, ...scenario.changed };
    const { client, requests } = createHttpHarness(expected);
    expect(await scenario.update(client)).toEqual(expected);
    expect(requests[0].method).toBe("PATCH");
    expect(requests[0].url.searchParams.get(scenario.scopeField)).toBe(`eq.${scenario.scopeId}`);
    if (scenario.targetId) expect(requests[0].url.searchParams.get("id")).toBe(`eq.${scenario.targetId}`);
    expect(requests[0].body).toEqual(scenario.changed);
  });

  test("does not change ownership through an update payload", async () => {
    const { client, requests } = createHttpHarness(scenarios[1].row);
    await new ProjectsModel(client, ownerId).update(projectId, { title: "Updated", user_id: "other" } as { title: string });
    expect(requests[0].body).toEqual({ title: "Updated" });
    expect(requests[0].url.searchParams.get("id")).toBe(`eq.${projectId}`);
  });
});

describe("model deletions", () => {
  test.each(scenarios)("$table removes only within its bound scope", async (scenario) => {
    const { client, requests } = createHttpHarness({ id: recordId });
    expect(await scenario.remove(client)).toBe(true);
    expect(requests[0].url.searchParams.get(scenario.scopeField)).toBe(`eq.${scenario.scopeId}`);
    if (scenario.targetId) expect(requests[0].url.searchParams.get("id")).toBe(`eq.${scenario.targetId}`);
    expect(requests[0].method).toBe(scenario.table === "projects" ? "PATCH" : "DELETE");
    if (scenario.table === "projects") expect(requests[0].body?.deleted_at).toEqual(expect.any(String));
  });

  test.each(scenarios)("$table reports false when a deletion affects no row", async (scenario) => {
    const { client } = createHttpHarness(null);
    expect(await scenario.remove(client)).toBe(false);
  });
});

describe("database error handling", () => {
  test.each(scenarios)("$table preserves error codes without exposing raw database details", async (scenario) => {
    const { client } = createHttpHarness({ code: "42501", message: "private-database-value", details: "", hint: "" }, 403);
    const error = await scenario.get(client).then(() => null, (failure: unknown) => failure);
    expect(error).toMatchObject({ name: "ModelError", code: "42501" });
    expect(String(error)).not.toContain("private-database-value");
  });
});

describe("project history", () => {
  test("filters soft-deleted projects and orders history newest first", async () => {
    const { client, requests } = createHttpHarness([scenarios[1].row]);
    expect(await new ProjectsModel(client, ownerId).list()).toHaveLength(1);
    expect(requests[0].url.searchParams.get("deleted_at")).toBe("is.null");
    expect(requests[0].url.searchParams.get("order")).toBe("updated_at.desc");
    expect(requests[0].url.searchParams.get("user_id")).toBe(`eq.${ownerId}`);
  });

  test("treats wildcard characters in title searches literally", async () => {
    const { client, requests } = createHttpHarness([]);
    await new ProjectsModel(client, ownerId).list("title_%");
    expect(requests[0].url.searchParams.get("title")).toBe("ilike.%title\\_\\%%");
  });
});

describe("phase, feature, and export lists", () => {
  test("orders phase and feature lists by sort within the project", async () => {
    const { client, requests } = createHttpHarness([]);
    await new PhasesModel(client, projectId).list();
    await new FeaturesModel(client, projectId).list(recordId);
    for (const request of requests) {
      expect(request.url.searchParams.get("project_id")).toBe(`eq.${projectId}`);
      expect(request.url.searchParams.get("order")).toBe("sort.asc");
    }
    expect(requests[1].url.searchParams.get("phase_id")).toBe(`eq.${recordId}`);
  });

  test("orders exports newest first", async () => {
    const { client, requests } = createHttpHarness([]);
    await new ExportsModel(client, projectId).list();
    expect(requests[0].url.searchParams.get("order")).toBe("created_at.desc");
  });
});
