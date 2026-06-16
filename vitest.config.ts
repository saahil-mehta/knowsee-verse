import { defineConfig } from "vitest/config";

// Unit tests live next to the code under lib/. The Playwright e2e suite under
// tests/ is run separately (pnpm test), so it is excluded here to avoid the two
// runners fighting over the same *.test.ts files.
export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" -> "./*" path alias.
    alias: { "@": import.meta.dirname },
  },
  test: {
    include: ["lib/**/*.{test,spec}.ts"],
    exclude: ["node_modules", ".next", "tests"],
    environment: "node",
  },
});
