/**
 * @file    tests/unit/models/http-harness.ts
 * @brief   Capture real Supabase HTTP requests while isolating the external PostgREST boundary
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../lib/types/database";

export type CapturedRequest = { url: URL; method: string; body: Record<string, unknown> | null };

export function createHttpHarness(response: unknown, status = 200) {
  const requests: CapturedRequest[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const text = await request.text();
    requests.push({ url: new URL(request.url), method: request.method, body: text ? JSON.parse(text) : null });
    const isObject = request.headers.get("accept")?.includes("vnd.pgrst.object");
    const body = !isObject && status < 400 && !Array.isArray(response)
      ? (response === null ? [] : [response]) : response;
    return Response.json(body, { status });
  };
  const client = createClient<Database>("https://example.supabase.co", "test-publishable-key", {
    global: { fetch }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { client, requests };
}
