// Flat ESLint config (ESLint 9+), shared across the whole pnpm workspace.
// Every package resolves this same file — `eslint .` run from apps/api or
// apps/web walks up and finds it automatically, no per-package config needed.
import js from "@eslint/js";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

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
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Prefix with `_` to intentionally ignore an unused arg/var.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "separate-type-imports" },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
          message:
            "Don't use `as unknown as`. Fix the underlying type or narrow the value instead.",
        },
      ],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
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

  // Web + admin apps + shared React components: Next.js's own rule set
  // (Core Web Vitals + its TS rules), which also brings React/React Hooks/
  // jsx-a11y/import resolution — no need to configure those separately for
  // these packages.
  {
    files: [
      "apps/web/**/*.{ts,tsx}",
      "apps/admin/**/*.{ts,tsx}",
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

  {
    files: ["apps/admin/**/*.{ts,tsx}"],
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  {
    files: ["apps/api/src/modules/platform-*/**/*.ts"],
    ignores: ["apps/api/src/modules/platform-access/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "#modules/crm-*/*.repository.js",
                "**/modules/crm-*/*.repository.js",
                "**/crm-*/*.repository",
              ],
              message:
                "Platform modules read tenant data only through their own aggregate repositories or a crm-* service — never a crm-* repository directly.",
            },
          ],
        },
      ],
    },
  },

  // Must stay last: turns off stylistic rules that would conflict with
  // Prettier, which owns formatting.
  eslintConfigPrettier,
);
