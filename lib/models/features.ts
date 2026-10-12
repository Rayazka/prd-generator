/**
 * @file    lib/models/features.ts
 * @brief   Manage editable feature cards with a fixed project scope
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import "server-only";
import type { DatabaseClient, FeatureRow, Insert } from "../types/database";
import { optionalQuery, pickFields, removedQuery, requiredQuery } from "./query";

const fields = ["phase_id", "title", "desc_plain", "desc_tech", "priority", "status", "sort"] as const;
type FeatureInput = Pick<Insert<"features">, typeof fields[number]>;

export class FeaturesModel {
  constructor(private readonly client: DatabaseClient, private readonly projectId: string) {}

  async create(input: FeatureInput): Promise<FeatureRow> {
    return requiredQuery(this.client.from("features")
      .insert({ ...pickFields(input, fields), project_id: this.projectId }).select("*").single(), "Create feature");
  }

  async get(id: string): Promise<FeatureRow | null> {
    return optionalQuery(this.client.from("features").select("*")
      .eq("project_id", this.projectId).eq("id", id).maybeSingle(), "Read feature");
  }

  async list(phaseId?: string): Promise<FeatureRow[]> {
    let query = this.client.from("features").select("*").eq("project_id", this.projectId)
      .order("sort", { ascending: true });
    if (phaseId !== undefined) query = query.eq("phase_id", phaseId);
    return requiredQuery(query, "List features");
  }

  async update(id: string, input: Partial<FeatureInput>): Promise<FeatureRow | null> {
    return optionalQuery(this.client.from("features").update(pickFields(input, fields))
      .eq("project_id", this.projectId).eq("id", id).select("*").maybeSingle(), "Update feature");
  }

  async remove(id: string): Promise<boolean> {
    return removedQuery(this.client.from("features").delete().eq("project_id", this.projectId)
      .eq("id", id).select("id").maybeSingle(), "Delete feature");
  }
}
