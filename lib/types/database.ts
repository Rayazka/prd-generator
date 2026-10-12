/**
 * @file    lib/types/database.ts
 * @brief   Describe the initial PostgreSQL schema for typed Supabase model queries
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };
type Timestamps = { created_at: string; updated_at: string };
type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProfileRow = Timestamps & { id: string; email: string | null; display_name: string };
export type ProjectRow = Timestamps & {
  id: string; user_id: string; title: string; idea_raw: string; language: "id" | "en";
  status: "drafting" | "qa" | "part-a" | "part-b" | "phases" | "done";
  deleted_at: string | null;
};
export type QaBatchRow = Timestamps & { id: string; project_id: string; questions: Json; answers: Json };
export type PrdPartRow = Timestamps & {
  id: string; project_id: string; part_a_md: string | null; part_a_json: Json | null;
  summary_plain: string | null; stack_choice: "custom" | "recommended" | null; stack_detail: Json | null;
};
export type PhaseRow = Timestamps & {
  id: string; project_id: string; name: "MVP" | "V1" | "V2"; sort: number; is_done: boolean;
};
export type FeatureRow = Timestamps & {
  id: string; phase_id: string; project_id: string; title: string; desc_plain: string; desc_tech: string;
  priority: "P0" | "P1" | "P2"; status: "draft" | "approved" | "rejected"; sort: number;
};
export type ExportRow = {
  id: string; project_id: string; type: "md" | "pdf";
  content_text: string | null; file_path: string | null; created_at: string;
};
export type UserKeyRow = Timestamps & { user_id: string; provider: string; key_enc: string };

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      projects: Table<ProjectRow, "user_id" | "idea_raw">;
      qa_batches: Table<QaBatchRow, "project_id" | "questions">;
      prd_parts: Table<PrdPartRow, "project_id">;
      phases: Table<PhaseRow, "project_id" | "name">;
      features: Table<FeatureRow, "phase_id" | "project_id" | "title" | "desc_plain" | "priority">;
      exports: Table<ExportRow, "project_id" | "type">;
      user_keys: Table<UserKeyRow, "user_id" | "key_enc">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type DatabaseClient = SupabaseClient<Database>;
export type TableName = keyof Database["public"]["Tables"];
export type Insert<Name extends TableName> = Database["public"]["Tables"][Name]["Insert"];
