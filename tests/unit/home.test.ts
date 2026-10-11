/**
 * @file    tests/unit/home.test.ts
 * @brief   Verify scaffolded home page module exports a component
 * @author  opencode
 * @created 2026-10-12
 * @todo    none
 */
import { describe, expect, test } from "vitest";
import HomePage from "../../app/page";

describe("home page module", () => {
  test("exports a renderable component", () => {
    expect(typeof HomePage).toBe("function");
  });
});
