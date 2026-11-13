import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

import { describe, expect, it } from "vitest";

import {
  API_DOCS_TASK_RECORD,
  API_DOCS_TASK_WRITE,
  OPENAPI_OUTPUT_DIR,
  OPENAPI_SPEC_FILE,
  REGENERATE_SPEC_COMMAND,
} from "./openapi.constants.js";
import { generateOpenApiSpec } from "./openapi.generate.js";

const APP_IMPORT_TIMEOUT_MS = 180_000;
const isWritingSpec = process.env.API_DOCS_TASK === API_DOCS_TASK_WRITE;
const isRecordingExamples = process.env.API_DOCS_TASK === API_DOCS_TASK_RECORD;

describe.skipIf(isRecordingExamples)("API reference spec", () => {
  it(
    "matches the routes, guards and schemas in the code",
    async () => {
      const generatedSpec = await generateOpenApiSpec();

      if (isWritingSpec) {
        mkdirSync(OPENAPI_OUTPUT_DIR, { recursive: true });
        writeFileSync(OPENAPI_SPEC_FILE, generatedSpec);
        return;
      }

      const savedSpec: unknown = existsSync(OPENAPI_SPEC_FILE)
        ? JSON.parse(readFileSync(OPENAPI_SPEC_FILE, "utf8"))
        : null;
      const parsedGeneratedSpec: unknown = JSON.parse(generatedSpec);
      expect(
        isDeepStrictEqual(savedSpec, parsedGeneratedSpec),
        `apps/api/openapi/openapi.json is out of date. Run: ${REGENERATE_SPEC_COMMAND}`,
      ).toBe(true);
    },
    APP_IMPORT_TIMEOUT_MS,
  );
});
