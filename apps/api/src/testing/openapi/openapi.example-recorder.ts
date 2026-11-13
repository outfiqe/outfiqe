import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import type { Response } from "express";
import express from "express";
import { z } from "zod";

import { API_DOCS_TASK_RECORD, OPENAPI_RECORDINGS_DIR } from "./openapi.constants.js";
import type { JsonValue, RecordedExchange } from "./openapi.types.js";

const RECORDER_INSTALLED_MARKER = Symbol.for("outfiqe.apiDocs.exampleRecorderInstalled");
const QUERY_STRING_SEPARATOR = "?";

const jsonValueSchema = z.json();
const jsonObjectSchema = z.record(z.string(), z.json());

const toJsonValue = (value: unknown): JsonValue => {
  const serialized = JSON.stringify(value ?? null);
  const parsed: unknown = serialized === undefined ? null : JSON.parse(serialized);
  return jsonValueSchema.parse(parsed);
};

const toRecordedExchange = (res: Response, responseBody: unknown): RecordedExchange => {
  const { method, originalUrl, query, body } = res.req;
  const [requestPath = originalUrl] = originalUrl.split(QUERY_STRING_SEPARATOR);
  return {
    method,
    path: requestPath,
    status: res.statusCode,
    query: jsonObjectSchema.parse(toJsonValue(query)),
    requestBody: toJsonValue(body),
    responseBody: toJsonValue(responseBody),
  };
};

const appendRecordedExchange = (recordingFile: string, res: Response, responseBody: unknown) => {
  try {
    appendFileSync(recordingFile, `${JSON.stringify(toRecordedExchange(res, responseBody))}\n`);
  } catch {
    return;
  }
};

const installApiExampleRecorder = (): void => {
  const responsePrototype = express.response;
  if (Object.hasOwn(responsePrototype, RECORDER_INSTALLED_MARKER)) return;

  mkdirSync(OPENAPI_RECORDINGS_DIR, { recursive: true });
  const recordingFile = path.join(OPENAPI_RECORDINGS_DIR, `worker-${process.pid}.jsonl`);
  const originalJson = responsePrototype.json;

  responsePrototype.json = function recordJsonResponse(this: Response, responseBody?: unknown) {
    appendRecordedExchange(recordingFile, this, responseBody);
    return originalJson.call(this, responseBody);
  };
  Object.defineProperty(responsePrototype, RECORDER_INSTALLED_MARKER, { value: true });
};

export const installApiExampleRecorderWhenRequested = (): void => {
  if (process.env.API_DOCS_TASK === API_DOCS_TASK_RECORD) installApiExampleRecorder();
};
