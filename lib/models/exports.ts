/**
 * @file    lib/models/exports.ts
 * @brief   Store typed Markdown snapshots and PDF paths for one project
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import "server-only";
import type { DatabaseClient, ExportRow } from "../types/database";
import { optionalQuery, removedQuery, requiredQuery } from "./query";

type ExportInput = { type: "md"; content_text: string } | { type: "pdf"; file_path: string };

function exportPayload(input: ExportInput) {
  return input.type === "md"
    ? { type: input.type, content_text: input.content_text, file_path: null }
    : { type: input.type, content_text: null, file_path: input.file_path };
}

export class ExportsModel {
  constructor(private readonly client: DatabaseClient, private readonly projectId: string) {}

  async create(input: ExportInput): Promise<ExportRow> {
    return requiredQuery(this.client.from("exports")
      .insert({ ...exportPayload(input), project_id: this.projectId }).select("*").single(), "Create export");
  }

  async get(id: string): Promise<ExportRow | null> {
    return optionalQuery(this.client.from("exports").select("*")
      .eq("project_id", this.projectId).eq("id", id).maybeSingle(), "Read export");
  }

  async list(): Promise<ExportRow[]> {
    return requiredQuery(this.client.from("exports").select("*").eq("project_id", this.projectId)
      .order("created_at", { ascending: false }), "List exports");
  }

  async update(id: string, input: ExportInput): Promise<ExportRow | null> {
    return optionalQuery(this.client.from("exports").update(exportPayload(input))
      .eq("project_id", this.projectId).eq("id", id).select("*").maybeSingle(), "Update export");
  }

  async remove(id: string): Promise<boolean> {
    return removedQuery(this.client.from("exports").delete().eq("project_id", this.projectId)
      .eq("id", id).select("id").maybeSingle(), "Delete export");
  }
}
