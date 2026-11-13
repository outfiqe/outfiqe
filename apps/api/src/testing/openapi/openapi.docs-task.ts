import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import {
  API_DOCS_TASK_RECORD,
  API_DOCS_TASK_WRITE,
  API_PACKAGE_ROOT,
  OPENAPI_EXAMPLES_FILE,
  OPENAPI_RECORDINGS_DIR,
  OPENAPI_SPEC_FILE,
} from "./openapi.constants.js";
import { mergeRecordedExamples } from "./openapi.examples.js";
import { serializeJsonFile } from "./openapi.spec-file.js";
import type { RecordedExchange } from "./openapi.types.js";

const SPEC_TEST_FILE = "src/testing/openapi/openapi.spec.integration.test.ts";
const RECORDING_FILE_EXTENSION = ".jsonl";
const SUCCESS_EXIT_CODE = 0;
const FAILURE_EXIT_CODE = 1;
const TASK_ARGUMENT_POSITION = 2;

const recordedExchangeSchema = z.object({
  method: z.string(),
  path: z.string(),
  status: z.number().int(),
  query: z.record(z.string(), z.json()),
  requestBody: z.json(),
  responseBody: z.json(),
});

const savedSpecSchema = z.object({
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
});

const runIntegrationTests = (apiDocsTask: string, testFiles: string[]): number => {
  const vitestCommand = ["pnpm exec vitest run --project integration", ...testFiles].join(" ");
  const { status } = spawnSync(vitestCommand, {
    cwd: API_PACKAGE_ROOT,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, API_DOCS_TASK: apiDocsTask },
  });
  return status ?? FAILURE_EXIT_CODE;
};

const writeSpec = (): void => {
  if (runIntegrationTests(API_DOCS_TASK_WRITE, [SPEC_TEST_FILE]) !== SUCCESS_EXIT_CODE) {
    throw new Error("Writing apps/api/openapi/openapi.json failed. See the test output above.");
  }
};

const readRecordedExchanges = (): RecordedExchange[] => {
  if (!existsSync(OPENAPI_RECORDINGS_DIR)) return [];
  return readdirSync(OPENAPI_RECORDINGS_DIR)
    .filter((fileName) => fileName.endsWith(RECORDING_FILE_EXTENSION))
    .flatMap((fileName) =>
      readFileSync(path.join(OPENAPI_RECORDINGS_DIR, fileName), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line): RecordedExchange => recordedExchangeSchema.parse(JSON.parse(line))),
    );
};

const listOperationKeys = (): string[] => {
  const { paths } = savedSpecSchema.parse(JSON.parse(readFileSync(OPENAPI_SPEC_FILE, "utf8")));
  return Object.entries(paths).flatMap(([openApiPath, operationsByMethod]) =>
    Object.keys(operationsByMethod).map((method) => `${method.toUpperCase()} ${openApiPath}`),
  );
};

const recordExamples = (): void => {
  writeSpec();
  rmSync(OPENAPI_RECORDINGS_DIR, { recursive: true, force: true });

  if (runIntegrationTests(API_DOCS_TASK_RECORD, []) !== SUCCESS_EXIT_CODE) {
    process.stderr.write(
      "Some integration tests failed while recording. Examples from the passing ones are kept.\n",
    );
  }

  const examplesByOperation = mergeRecordedExamples(listOperationKeys(), readRecordedExchanges());
  writeFileSync(OPENAPI_EXAMPLES_FILE, serializeJsonFile(examplesByOperation));
  rmSync(OPENAPI_RECORDINGS_DIR, { recursive: true, force: true });
  writeSpec();
};

const API_DOCS_TASKS: Record<string, () => void> = {
  [API_DOCS_TASK_WRITE]: writeSpec,
  [API_DOCS_TASK_RECORD]: recordExamples,
};

const requestedTask = process.argv[TASK_ARGUMENT_POSITION] ?? "";
const runRequestedTask = API_DOCS_TASKS[requestedTask];

if (runRequestedTask) {
  runRequestedTask();
} else {
  process.stderr.write(`Usage: openapi.docs-task.ts <${Object.keys(API_DOCS_TASKS).join("|")}>\n`);
  process.exitCode = FAILURE_EXIT_CODE;
}
