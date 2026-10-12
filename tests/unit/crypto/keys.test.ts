/**
 * @file    tests/unit/crypto/keys.test.ts
 * @brief   Verify authenticated encryption and safe masking of API credentials
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import { describe, expect, test } from "vitest";
import { decryptKey, encryptKey, maskApiKey } from "../../../lib/crypto/keys";

const secret = "ab".repeat(32);
const owner = "00000000-0000-0000-0000-000000000001";
const apiKey = "sk-test-only-credential-1234";

describe("API key encryption", () => {
  test("round-trips a key without persisting plaintext", () => {
    const encrypted = encryptKey(apiKey, secret, owner);
    expect(encrypted).not.toContain(apiKey);
    expect(encrypted).toMatch(/^v1:[a-f0-9]{24}:[a-f0-9]{32}:[a-f0-9]+$/);
    expect(decryptKey(encrypted, secret, owner)).toBe(apiKey);
  });

  test("uses a fresh nonce for repeated encryptions", () => {
    const first = encryptKey(apiKey, secret, owner);
    const second = encryptKey(apiKey, secret, owner);
    expect(first).not.toBe(second);
    expect(first.split(":")[1]).not.toBe(second.split(":")[1]);
  });

  test("supports UTF-8 without losing characters", () => {
    const key = "test-credential-秘密";
    expect(decryptKey(encryptKey(key, secret, owner), secret, owner)).toBe(key);
  });
});

describe("key integrity and ownership", () => {
  test.each([1, 2, 3])("rejects a modified payload segment %s", (segment) => {
    const parts = encryptKey(apiKey, secret, owner).split(":");
    parts[segment] = `${parts[segment][0] === "0" ? "1" : "0"}${parts[segment].slice(1)}`;
    expect(() => decryptKey(parts.join(":"), secret, owner)).toThrow("Unable to decrypt API key");
  });

  test("rejects the wrong encryption secret", () => {
    expect(() => decryptKey(encryptKey(apiKey, secret, owner), "cd".repeat(32), owner))
      .toThrow("Unable to decrypt API key");
  });

  test("cannot decrypt a ciphertext copied to another user", () => {
    expect(() => decryptKey(encryptKey(apiKey, secret, owner), secret, "another-owner"))
      .toThrow("Unable to decrypt API key");
  });
});

describe("key input validation", () => {
  test.each(["", "password", "g".repeat(64), "a".repeat(62)])("rejects an invalid secret (%s)", (value) => {
    expect(() => encryptKey(apiKey, value, owner)).toThrow("KEYS_ENC_SECRET");
  });

  test.each(["", "v2:bad", "v1:00:00:00", "v1:bad:bad:bad", "v1:::extra:segment"])
    ("rejects malformed ciphertext (%s)", (value) => {
      expect(() => decryptKey(value, secret, owner)).toThrow("Unable to decrypt API key");
    });

  test("rejects an empty key and missing owner", () => {
    expect(() => encryptKey(" ", secret, owner)).toThrow("API key is required");
    expect(() => encryptKey(apiKey, secret, "")).toThrow("Owner is required");
  });
});

describe("key masking", () => {
  test("shows only a provider prefix and last four characters", () => {
    expect(maskApiKey(apiKey)).toBe("sk-...1234");
  });

  test.each(["", "a", "shortkey"])("never reveals a complete short credential (%s)", (key) => {
    expect(maskApiKey(key)).toBe("****");
  });
});
