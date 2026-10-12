/**
 * @file    lib/models/prdParts.ts
 * @brief   Store PRD content and stack decisions within one project
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import "server-only";
import type { DatabaseClient, Insert, PrdPartRow } from "../types/database";
import { optionalQuery, pickFields, removedQuery, requiredQuery } from "./query";

const fields = ["part_a_md", "part_a_json", "summary_plain", "stack_choice", "stack_detail"] as const;
type PartInput = Pick<Insert<"prd_parts">, typeof fields[number]>;

export class PrdPartsModel {
  constructor(private readonly client: DatabaseClient, private readonly projectId: string) {}

  async create(input: PartInput): Promise<PrdPartRow> {
    return requiredQuery(this.client.from("prd_parts")
      .insert({ ...pickFields(input, fields), project_id: this.projectId }).select("*").single(), "Create PRD parts");
  }

  async get(): Promise<PrdPartRow | null> {
    return optionalQuery(this.client.from("prd_parts").select("*")
      .eq("project_id", this.projectId).maybeSingle(), "Read PRD parts");
  }

  async update(input: PartInput): Promise<PrdPartRow | null> {
    return optionalQuery(this.client.from("prd_parts").update(pickFields(input, fields))
      .eq("project_id", this.projectId).select("*").maybeSingle(), "Update PRD parts");
  }

  async remove(): Promise<boolean> {
    return removedQuery(this.client.from("prd_parts").delete().eq("project_id", this.projectId)
      .select("id").maybeSingle(), "Delete PRD parts");
  }
}
