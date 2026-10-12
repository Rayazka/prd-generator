import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Unit tests run trusted server modules outside Next.js's React Server runtime.
    alias: { "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts?(x)", "tests/database/**/*.test.ts"],
    environment: "node",
  },
});
