/**
 * @file    lib/models/profiles.ts
 * @brief   Read and mutate the authenticated owner's profile
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import "server-only";
import type { DatabaseClient, Insert, ProfileRow } from "../types/database";
import { optionalQuery, pickFields, removedQuery, requiredQuery } from "./query";

type ProfileInput = Pick<Insert<"profiles">, "email" | "display_name">;
const fields = ["email", "display_name"] as const;

export class ProfilesModel {
  constructor(private readonly client: DatabaseClient, private readonly ownerId: string) {}

  async create(input: ProfileInput): Promise<ProfileRow> {
    return requiredQuery(this.client.from("profiles")
      .insert({ ...pickFields(input, fields), id: this.ownerId }).select("*").single(), "Create profile");
  }

  async get(): Promise<ProfileRow | null> {
    return optionalQuery(this.client.from("profiles").select("*").eq("id", this.ownerId).maybeSingle(), "Read profile");
  }

  async update(input: ProfileInput): Promise<ProfileRow | null> {
    return optionalQuery(this.client.from("profiles").update(pickFields(input, fields))
      .eq("id", this.ownerId).select("*").maybeSingle(), "Update profile");
  }

  async remove(): Promise<boolean> {
    return removedQuery(this.client.from("profiles").delete().eq("id", this.ownerId)
      .select("id").maybeSingle(), "Delete profile");
  }
}
