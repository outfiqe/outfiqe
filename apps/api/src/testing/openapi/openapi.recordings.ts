import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import type { RecordedExchange } from "./openapi.types.js";

const RECORDING_FILE_EXTENSION = ".jsonl";

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

const parseRecordingFile = (recordingFilePath: string): RecordedExchange[] =>
  readFileSync(recordingFilePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line): RecordedExchange => recordedExchangeSchema.parse(JSON.parse(line)));

export const readRecordedExchanges = (recordingsDir: string): RecordedExchange[] => {
  if (!existsSync(recordingsDir)) return [];
  return readdirSync(recordingsDir, { recursive: true, encoding: "utf8" })
    .filter((relativePath) => relativePath.endsWith(RECORDING_FILE_EXTENSION))
    .flatMap((relativePath) => parseRecordingFile(path.join(recordingsDir, relativePath)));
};

export const listOperationKeys = (specFilePath: string): string[] => {
  const { paths } = savedSpecSchema.parse(JSON.parse(readFileSync(specFilePath, "utf8")));
  return Object.entries(paths).flatMap(([openApiPath, operationsByMethod]) =>
    Object.keys(operationsByMethod).map((method) => `${method.toUpperCase()} ${openApiPath}`),
  );
};
