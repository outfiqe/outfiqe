import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      include: [
        "src/features/auth/utils/safeRedirect.ts",
        "src/components/ProductGridSkeleton.tsx",
        "src/features/brand-profile/hooks/useInfiniteBrandProducts.ts",
        "src/features/brand-profile/api/brandProfileApi.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["test/unit/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./test/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./test/setup.ts", "./test/integration/setup.ts"],
        },
      },
    ],
  },
});
