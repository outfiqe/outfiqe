import type { z } from "zod";

import type { RouteDocsInfo } from "#types/route-docs.types.js";

import type { DOCUMENTED_HTTP_METHODS } from "./openapi.constants.js";

export type DocumentedHttpMethod = (typeof DOCUMENTED_HTTP_METHODS)[number];

export type RecordedHandler = {
  name: string;
  docs: RouteDocsInfo | undefined;
};

export type RecordedEndpoint = {
  method: DocumentedHttpMethod;
  expressPath: string;
  handlers: RecordedHandler[];
  sourceFile: string | undefined;
};

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export type RecordedExchange = {
  method: string;
  path: string;
  status: number;
  query: JsonObject;
  requestBody: JsonValue;
  responseBody: JsonValue;
};

export type EndpointExample = {
  status: number;
  query: JsonObject;
  requestBody: JsonValue;
  responseBody: JsonValue;
};

export type ExamplesByOperation = Record<string, EndpointExample[]>;

export type OpenApiSchema = z.core.JSONSchema.JSONSchema;

export type OpenApiParameter = {
  name: string;
  in: "path" | "query" | "header";
  required: boolean;
  description?: string;
  schema: OpenApiSchema;
};

export type OpenApiNamedExample = { summary: string; value: JsonValue };

export type OpenApiMediaType = {
  schema: OpenApiSchema;
  example?: JsonValue;
  examples?: Record<string, OpenApiNamedExample>;
};

export type OpenApiResponse = {
  description: string;
  content?: Record<string, OpenApiMediaType>;
};

export type OpenApiSecurityRequirement = Record<string, string[]>;

export type OpenApiOperation = {
  operationId: string;
  summary: string;
  description: string;
  tags: string[];
  security?: OpenApiSecurityRequirement[];
  parameters: OpenApiParameter[];
  requestBody?: { required: boolean; content: Record<string, OpenApiMediaType> };
  responses: Record<string, OpenApiResponse>;
};

export type OpenApiTag = { name: string; description?: string };

export type OpenApiDocument = {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: { url: string; description: string }[];
  tags: OpenApiTag[];
  paths: Record<string, Partial<Record<DocumentedHttpMethod, OpenApiOperation>>>;
  components: {
    securitySchemes: Record<string, { type: string; scheme: string; bearerFormat: string }>;
    schemas: Record<string, OpenApiSchema>;
  };
};

export type GuardError = { status: number; code: string; message: string; details?: JsonValue };

export type AuthRequirement = "required" | "optional" | "none";

export type OperationAccess = {
  authRequirement: AuthRequirement;
  accessNotes: string[];
  headerParameters: OpenApiParameter[];
  guardErrors: GuardError[];
  isMultipart: boolean;
};
