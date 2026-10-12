/**
 * @file    lib/models/projects.ts
 * @brief   Manage owner-scoped projects and soft-deleted history
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import "server-only";
import type { DatabaseClient, Insert, ProjectRow } from "../types/database";
import { optionalQuery, pickFields, removedQuery, requiredQuery } from "./query";

type ProjectInput = Pick<Insert<"projects">, "title" | "idea_raw" | "language">;
type ProjectPatch = Partial<Pick<ProjectRow, "title" | "language" | "status">>;

export class ProjectsModel {
  constructor(private readonly client: DatabaseClient, private readonly ownerId: string) {}

  async create(input: ProjectInput): Promise<ProjectRow> {
    const payload = { ...pickFields(input, ["title", "idea_raw", "language"]), user_id: this.ownerId };
    return requiredQuery(this.client.from("projects").insert(payload).select("*").single(), "Create project");
  }

  async get(id: string): Promise<ProjectRow | null> {
    return optionalQuery(this.client.from("projects").select("*").eq("user_id", this.ownerId)
      .eq("id", id).is("deleted_at", null).maybeSingle(), "Read project");
  }

  async list(search = ""): Promise<ProjectRow[]> {
    let query = this.client.from("projects").select("*").eq("user_id", this.ownerId)
      .is("deleted_at", null).order("updated_at", { ascending: false });
    if (search.trim()) query = query.ilike("title", `%${search.trim().replace(/[\\%_]/g, "\\$&")}%`);
    return requiredQuery(query, "List projects");
  }

  async update(id: string, input: ProjectPatch): Promise<ProjectRow | null> {
    return optionalQuery(this.client.from("projects").update(pickFields(input, ["title", "language", "status"]))
      .eq("user_id", this.ownerId).eq("id", id).is("deleted_at", null).select("*").maybeSingle(), "Update project");
  }

  async remove(id: string): Promise<boolean> {
    return removedQuery(this.client.from("projects").update({ deleted_at: new Date().toISOString() })
      .eq("user_id", this.ownerId).eq("id", id).is("deleted_at", null).select("id").maybeSingle(), "Delete project");
  }
}
