/**
 * @file    lib/models/userKeys.ts
 * @brief   Store encrypted owner-bound credentials and expose masked metadata by default
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import "server-only";
import { decryptKey, encryptKey, maskApiKey } from "../crypto/keys";
import type { DatabaseClient, UserKeyRow } from "../types/database";
import { optionalQuery, removedQuery, requiredQuery } from "./query";

type KeyInput = { provider: string; key: string };
type StoredMetadata = Pick<UserKeyRow, "provider" | "created_at" | "updated_at">;
type StoredKey = StoredMetadata & Pick<UserKeyRow, "key_enc">;
export type UserKeyMetadata = StoredMetadata & { mask: string };
const metadataColumns = "provider,created_at,updated_at";

function maskedMetadata(row: StoredMetadata, apiKey: string): UserKeyMetadata {
  return { provider: row.provider, created_at: row.created_at, updated_at: row.updated_at, mask: maskApiKey(apiKey) };
}

export class UserKeysModel {
  constructor(private readonly client: DatabaseClient, private readonly ownerId: string, private readonly secret: string) {}

  async create(input: KeyInput): Promise<UserKeyMetadata> {
    const key_enc = encryptKey(input.key, this.secret, this.ownerId);
    const row = await requiredQuery<StoredMetadata>(this.client.from("user_keys")
      .insert({ user_id: this.ownerId, provider: input.provider, key_enc }).select(metadataColumns).single(), "Create user key");
    return maskedMetadata(row, input.key);
  }

  async update(input: KeyInput): Promise<UserKeyMetadata | null> {
    const key_enc = encryptKey(input.key, this.secret, this.ownerId);
    const row = await optionalQuery<StoredMetadata>(this.client.from("user_keys").update({ provider: input.provider, key_enc })
      .eq("user_id", this.ownerId).select(metadataColumns).maybeSingle(), "Update user key");
    return row ? maskedMetadata(row, input.key) : null;
  }

  private async readStoredKey(): Promise<StoredKey | null> {
    return optionalQuery(this.client.from("user_keys").select("provider,key_enc,created_at,updated_at")
      .eq("user_id", this.ownerId).maybeSingle(), "Read user key");
  }

  async get(): Promise<UserKeyMetadata | null> {
    const row = await this.readStoredKey();
    return row ? maskedMetadata(row, decryptKey(row.key_enc, this.secret, this.ownerId)) : null;
  }

  async getDecrypted(): Promise<{ provider: string; key: string } | null> {
    const row = await this.readStoredKey();
    return row ? { provider: row.provider, key: decryptKey(row.key_enc, this.secret, this.ownerId) } : null;
  }

  async remove(): Promise<boolean> {
    return removedQuery(this.client.from("user_keys").delete().eq("user_id", this.ownerId)
      .select("user_id").maybeSingle(), "Delete user key");
  }
}
