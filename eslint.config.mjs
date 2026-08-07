// Flat ESLint config (ESLint 9+), shared across the whole pnpm workspace.
// Every package resolves this same file — `eslint .` run from apps/api or
// apps/web walks up and finds it automatically, no per-package config needed.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.turbo/**",
      // Prisma-generated client — not hand-written, not ours to lint.
      "apps/api/src/generated/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Defaults for everything (API, shared-types, config files).
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Prefix with `_` to intentionally ignore an unused arg/var.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Root-level Node tooling config (CommonJS, since package.json has no
  // "type": "module") — these legitimately use require(), so the
  // TS-recommended ban on it doesn't apply here.
  {
    files: ["*.cjs", "*.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Web app only: React Hooks correctness + Vite Fast Refresh compatibility.
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // Must stay last: turns off stylistic rules that would conflict with
  // Prettier, which owns formatting.
  eslintConfigPrettier,
);
