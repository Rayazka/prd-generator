/**
 * @file    tests/unit/models/userKeys.test.ts
 * @brief   Verify user-key CRUD never returns plaintext through its public metadata methods
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import { describe, expect, test } from "vitest";
import { decryptKey, encryptKey } from "../../../lib/crypto/keys";
import { UserKeysModel } from "../../../lib/models/userKeys";
import { createHttpHarness } from "./http-harness";
import { ownerId, times } from "./cases";

const secret = "ab".repeat(32);
const apiKey = "sk-test-only-credential-1234";
const metadata = { provider: "openai", ...times };

describe("encrypted user-key writes", () => {
  test.each(["create", "update"] as const)("%s stores only ciphertext and returns a mask", async (operation) => {
    const { client, requests } = createHttpHarness(metadata);
    const model = new UserKeysModel(client, ownerId, secret);
    const result = await model[operation]({ provider: "openai", key: apiKey });
    expect(result).toEqual({ ...metadata, mask: "sk-...1234" });
    expect(requests[0].body).not.toHaveProperty("key");
    expect(JSON.stringify(requests[0].body)).not.toContain(apiKey);
    expect(decryptKey(String(requests[0].body?.key_enc), secret, ownerId)).toBe(apiKey);
    expect(requests[0].url.searchParams.get("select")).not.toContain("key_enc");
    if (operation === "create") expect(requests[0].body?.user_id).toBe(ownerId);
    else expect(requests[0].url.searchParams.get("user_id")).toBe(`eq.${ownerId}`);
  });

  test("rejects unsafe encryption configuration before making a request", async () => {
    const { client, requests } = createHttpHarness(metadata);
    await expect(new UserKeysModel(client, ownerId, "").create({ provider: "openai", key: apiKey }))
      .rejects.toThrow("KEYS_ENC_SECRET");
    expect(requests).toHaveLength(0);
  });
});

describe("encrypted user-key reads", () => {
  test("exposes only masked metadata through get", async () => {
    const { client, requests } = createHttpHarness({ ...metadata, user_id: ownerId, key_enc: encryptKey(apiKey, secret, ownerId) });
    const result = await new UserKeysModel(client, ownerId, secret).get();
    expect(result).toEqual({ ...metadata, mask: "sk-...1234" });
    expect(JSON.stringify(result)).not.toContain(apiKey);
    expect(result).not.toHaveProperty("key_enc");
    expect(requests[0].url.searchParams.get("user_id")).toBe(`eq.${ownerId}`);
  });

  test("decrypts only through the explicitly server-only method", async () => {
    const { client } = createHttpHarness({ ...metadata, user_id: ownerId, key_enc: encryptKey(apiKey, secret, ownerId) });
    expect(await new UserKeysModel(client, ownerId, secret).getDecrypted()).toEqual({ provider: "openai", key: apiKey });
  });

  test("returns null when no key is saved", async () => {
    const { client } = createHttpHarness(null);
    expect(await new UserKeysModel(client, ownerId, secret).get()).toBeNull();
  });
});

describe("user-key deletion and errors", () => {
  test("deletes only the bound user's saved key", async () => {
    const { client, requests } = createHttpHarness({ user_id: ownerId });
    expect(await new UserKeysModel(client, ownerId, secret).remove()).toBe(true);
    expect(requests[0].method).toBe("DELETE");
    expect(requests[0].url.searchParams.get("user_id")).toBe(`eq.${ownerId}`);
  });

  test("returns false when there is no saved key to delete", async () => {
    const { client } = createHttpHarness(null);
    expect(await new UserKeysModel(client, ownerId, secret).remove()).toBe(false);
  });

  test("does not leak database details when saving fails", async () => {
    const { client } = createHttpHarness({ code: "42501", message: apiKey, details: "", hint: "" }, 403);
    const error = await new UserKeysModel(client, ownerId, secret).create({ provider: "openai", key: apiKey })
      .then(() => null, (failure: unknown) => failure);
    expect(error).toMatchObject({ name: "ModelError", code: "42501" });
    expect(String(error)).not.toContain(apiKey);
  });
});
