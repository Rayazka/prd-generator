/**
 * @file    lib/models/phases.ts
 * @brief   Manage ordered phases without changing their parent project
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import "server-only";
import type { DatabaseClient, Insert, PhaseRow } from "../types/database";
import { optionalQuery, pickFields, removedQuery, requiredQuery } from "./query";

type PhaseInput = Pick<Insert<"phases">, "name" | "sort" | "is_done">;
const fields = ["name", "sort", "is_done"] as const;

export class PhasesModel {
  constructor(private readonly client: DatabaseClient, private readonly projectId: string) {}

  async create(input: PhaseInput): Promise<PhaseRow> {
    return requiredQuery(this.client.from("phases")
      .insert({ ...pickFields(input, fields), project_id: this.projectId }).select("*").single(), "Create phase");
  }

  async get(id: string): Promise<PhaseRow | null> {
    return optionalQuery(this.client.from("phases").select("*")
      .eq("project_id", this.projectId).eq("id", id).maybeSingle(), "Read phase");
  }

  async list(): Promise<PhaseRow[]> {
    return requiredQuery(this.client.from("phases").select("*").eq("project_id", this.projectId)
      .order("sort", { ascending: true }), "List phases");
  }

  async update(id: string, input: Partial<PhaseInput>): Promise<PhaseRow | null> {
    return optionalQuery(this.client.from("phases").update(pickFields(input, fields))
      .eq("project_id", this.projectId).eq("id", id).select("*").maybeSingle(), "Update phase");
  }

  async remove(id: string): Promise<boolean> {
    return removedQuery(this.client.from("phases").delete().eq("project_id", this.projectId)
      .eq("id", id).select("id").maybeSingle(), "Delete phase");
  }
}
