import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";

import {
  API_DOCS_TASK_MERGE,
  API_DOCS_TASK_RECORD,
  API_DOCS_TASK_WRITE,
  API_PACKAGE_ROOT,
  OPENAPI_EXAMPLES_FILE,
  OPENAPI_RECORDINGS_DIR,
  OPENAPI_SPEC_FILE,
} from "./openapi.constants.js";
import { keepUnchangedExamples, mergeRecordedExamples } from "./openapi.examples.js";
import { listOperationKeys, readRecordedExchanges } from "./openapi.recordings.js";
import { readSavedExamples, serializeJsonFile } from "./openapi.spec-file.js";

const SPEC_TEST_FILE = "src/testing/openapi/openapi.spec.integration.test.ts";
const SUCCESS_EXIT_CODE = 0;
const FAILURE_EXIT_CODE = 1;
const TASK_ARGUMENT_POSITION = 2;

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

const mergeRecordingsIntoExamples = (): void => {
  const freshExamplesByOperation = mergeRecordedExamples(
    listOperationKeys(OPENAPI_SPEC_FILE),
    readRecordedExchanges(OPENAPI_RECORDINGS_DIR),
  );
  const examplesByOperation = keepUnchangedExamples(readSavedExamples(), freshExamplesByOperation);
  writeFileSync(OPENAPI_EXAMPLES_FILE, serializeJsonFile(examplesByOperation));
  rmSync(OPENAPI_RECORDINGS_DIR, { recursive: true, force: true });
  writeSpec();
};

const recordExamples = (): void => {
  writeSpec();
  rmSync(OPENAPI_RECORDINGS_DIR, { recursive: true, force: true });

  if (runIntegrationTests(API_DOCS_TASK_RECORD, []) !== SUCCESS_EXIT_CODE) {
    process.stderr.write(
      "Some integration tests failed while recording. Examples from the passing ones are kept.\n",
    );
  }

  mergeRecordingsIntoExamples();
};

const API_DOCS_TASKS: Record<string, () => void> = {
  [API_DOCS_TASK_WRITE]: writeSpec,
  [API_DOCS_TASK_RECORD]: recordExamples,
  [API_DOCS_TASK_MERGE]: mergeRecordingsIntoExamples,
};

const requestedTask = process.argv[TASK_ARGUMENT_POSITION] ?? "";
const runRequestedTask = API_DOCS_TASKS[requestedTask];

if (runRequestedTask) {
  runRequestedTask();
} else {
  process.stderr.write(`Usage: openapi.docs-task.ts <${Object.keys(API_DOCS_TASKS).join("|")}>\n`);
  process.exitCode = FAILURE_EXIT_CODE;
}
