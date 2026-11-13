import { existsSync, readFileSync } from "node:fs";

import { z } from "zod";

import { OPENAPI_EXAMPLES_FILE } from "./openapi.constants.js";
import type { ExamplesByOperation } from "./openapi.types.js";

const JSON_INDENT_SPACES = 2;

const examplesFileSchema = z.record(
  z.string(),
  z.array(
    z.object({
      status: z.number().int(),
      query: z.record(z.string(), z.json()),
      requestBody: z.json(),
      responseBody: z.json(),
    }),
  ),
);

export const serializeJsonFile = (fileContent: unknown): string =>
  `${JSON.stringify(fileContent, null, JSON_INDENT_SPACES)}\n`;

export const readSavedExamples = (): ExamplesByOperation => {
  if (!existsSync(OPENAPI_EXAMPLES_FILE)) return {};
  const savedExamples: unknown = JSON.parse(readFileSync(OPENAPI_EXAMPLES_FILE, "utf8"));
  return examplesFileSchema.parse(savedExamples);
};
