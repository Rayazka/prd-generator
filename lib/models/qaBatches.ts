/**
 * @file    lib/models/qaBatches.ts
 * @brief   Store one Q&A batch within a project accessible to the session's owner
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import "server-only";
import type { DatabaseClient, QaBatchRow } from "../types/database";
import { optionalQuery, pickFields, removedQuery, requiredQuery } from "./query";

type BatchInput = { questions: string[]; answers?: string[] };
type BatchPatch = Partial<BatchInput>;

export class QaBatchesModel {
  constructor(private readonly client: DatabaseClient, private readonly projectId: string) {}

  async create(input: BatchInput): Promise<QaBatchRow> {
    return requiredQuery(this.client.from("qa_batches")
      .insert({ ...pickFields(input, ["questions", "answers"]), project_id: this.projectId })
      .select("*").single(), "Create Q&A batch");
  }

  async get(): Promise<QaBatchRow | null> {
    return optionalQuery(this.client.from("qa_batches").select("*")
      .eq("project_id", this.projectId).maybeSingle(), "Read Q&A batch");
  }

  async update(input: BatchPatch): Promise<QaBatchRow | null> {
    return optionalQuery(this.client.from("qa_batches").update(pickFields(input, ["questions", "answers"]))
      .eq("project_id", this.projectId).select("*").maybeSingle(), "Update Q&A batch");
  }

  async remove(): Promise<boolean> {
    return removedQuery(this.client.from("qa_batches").delete().eq("project_id", this.projectId)
      .select("id").maybeSingle(), "Delete Q&A batch");
  }
}
