import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  API_SOURCE_ROOT,
  DOCUMENTED_HTTP_METHODS,
  DOCUMENTED_PATH_PREFIX,
  LOCAL_API_SERVER_URL,
  PRODUCTION_API_SERVER_URL,
} from "./openapi.constants.js";
import { toOpenApiPath, toOperationKey, toTagFolder, toTagName } from "./openapi.naming.js";
import { buildOperation } from "./openapi.operation.js";
import { errorResponseSchemas } from "./openapi.schemas.js";
import type {
  ExamplesByOperation,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiTag,
  RecordedEndpoint,
} from "./openapi.types.js";

const OPENAPI_VERSION = "3.1.0";
const API_DOCS_VERSION = "1.0.0";
const README_FILE_NAME = "README.md";
const PURPOSE_HEADING = "## Purpose";
const MODULES_FOLDER = "modules";
const NEXT_HEADING_PREFIX = "#";

const API_DESCRIPTION = [
  "The Outfiqe REST API. Every response is JSON.",
  "",
  "- Success: `{ success: true, message, data }`",
  "- Error: `{ success: false, message, code, details? }`",
].join("\n");

const readPurposeParagraph = (readmePath: string): string | undefined => {
  if (!existsSync(readmePath)) return undefined;
  const readmeLines = readFileSync(readmePath, "utf8").split(/\r?\n/);
  const purposeHeadingIndex = readmeLines.findIndex((line) => line.trim() === PURPOSE_HEADING);
  if (purposeHeadingIndex === -1) return undefined;

  const paragraphLines: string[] = [];
  for (const line of readmeLines.slice(purposeHeadingIndex + 1)) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith(NEXT_HEADING_PREFIX)) break;
    if (!trimmedLine && paragraphLines.length > 0) break;
    if (trimmedLine) paragraphLines.push(trimmedLine);
  }
  return paragraphLines.join(" ") || undefined;
};

const describeTagFolder = (tagFolder: string | undefined): string | undefined => {
  if (!tagFolder) return undefined;
  const [moduleFolder = ""] = tagFolder.split("/");
  const candidateFolders = [tagFolder, moduleFolder];
  for (const candidateFolder of candidateFolders) {
    const readmePath = path.join(
      API_SOURCE_ROOT,
      MODULES_FOLDER,
      candidateFolder,
      README_FILE_NAME,
    );
    const purposeParagraph = readPurposeParagraph(readmePath);
    if (purposeParagraph) return purposeParagraph;
  }
  return undefined;
};

const compareEndpoints = (first: RecordedEndpoint, second: RecordedEndpoint): number =>
  first.expressPath.localeCompare(second.expressPath) ||
  DOCUMENTED_HTTP_METHODS.indexOf(first.method) - DOCUMENTED_HTTP_METHODS.indexOf(second.method);

const makeSummariesUniquePerTag = (operations: [string, OpenApiOperation][]): void => {
  const operationsBySummary = new Map<string, [string, OpenApiOperation][]>();
  for (const entry of operations) {
    const [, { summary, tags }] = entry;
    const summaryKey = `${tags.join()}|${summary}`;
    operationsBySummary.set(summaryKey, [...(operationsBySummary.get(summaryKey) ?? []), entry]);
  }
  for (const sameSummaryOperations of operationsBySummary.values()) {
    if (sameSummaryOperations.length === 1) continue;
    for (const [operationKey, operation] of sameSummaryOperations) {
      operation.summary = `${operation.summary} (${operationKey})`;
    }
  }
};

const buildTags = (tagFolders: Map<string, string | undefined>): OpenApiTag[] =>
  [...tagFolders.entries()]
    .sort(([firstName], [secondName]) => firstName.localeCompare(secondName))
    .map(([name, tagFolder]) => {
      const description = describeTagFolder(tagFolder);
      return description ? { name, description } : { name };
    });

export const buildOpenApiDocument = (
  endpoints: RecordedEndpoint[],
  examplesByOperation: ExamplesByOperation,
): OpenApiDocument => {
  const documentedEndpoints = endpoints
    .filter(({ expressPath }) => expressPath.startsWith(DOCUMENTED_PATH_PREFIX))
    .sort(compareEndpoints);
  const tagFolders = new Map<string, string | undefined>();
  const operations: [string, OpenApiOperation][] = [];
  const paths: OpenApiDocument["paths"] = {};

  for (const endpoint of documentedEndpoints) {
    const openApiPath = toOpenApiPath(endpoint.expressPath);
    const operationKey = toOperationKey(endpoint.method, openApiPath);
    const tagFolder = toTagFolder(endpoint.sourceFile);
    const tagName = toTagName(tagFolder);
    tagFolders.set(tagName, tagFolder);

    const examples = examplesByOperation[operationKey] ?? [];
    const operation = buildOperation(endpoint, openApiPath, tagName, examples);
    operations.push([operationKey, operation]);
    paths[openApiPath] = { ...paths[openApiPath], [endpoint.method]: operation };
  }
  makeSummariesUniquePerTag(operations);

  return {
    openapi: OPENAPI_VERSION,
    info: { title: "Outfiqe API", version: API_DOCS_VERSION, description: API_DESCRIPTION },
    servers: [
      { url: LOCAL_API_SERVER_URL, description: "Local API" },
      { url: PRODUCTION_API_SERVER_URL, description: "Production" },
    ],
    tags: buildTags(tagFolders),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: errorResponseSchemas,
    },
  };
};
