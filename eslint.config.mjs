// Flat ESLint config (ESLint 9+), shared across the whole pnpm workspace.
// Every package resolves this same file — `eslint .` run from apps/api or
// apps/web walks up and finds it automatically, no per-package config needed.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/.next/**",
      // Prisma-generated client — not hand-written, not ours to lint.
      "apps/api/src/generated/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Defaults for everything (API, types, config files).
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

  // Web app + shared React components: Next.js's own rule set (Core Web
  // Vitals + its TS rules), which also brings React/React Hooks/jsx-a11y/
  // import resolution — no need to configure those separately for this package.
  {
    files: [
      "apps/web/**/*.{ts,tsx}",
      "packages/components/**/*.{ts,tsx}",
      "packages/design-system/**/*.{ts,tsx}",
    ],
    extends: [nextCoreWebVitals, nextTypescript],
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      // eslint-plugin-react@7.37.5 (bundled by eslint-config-next) defaults
      // to auto-detecting the React version via context.getFilename() —
      // an API ESLint 10 removed, which crashes the linter outright.
      // Pinning the version explicitly skips that code path entirely.
      react: { version: "19.2.8" },
    },
  },

  // Must stay last: turns off stylistic rules that would conflict with
  // Prettier, which owns formatting.
  eslintConfigPrettier,
);
