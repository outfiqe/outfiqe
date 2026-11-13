import type { ZodType } from "zod";
import { z } from "zod";

import type { JsonValue, OpenApiParameter, OpenApiSchema } from "./openapi.types.js";

const JSON_SCHEMA_DIALECT_KEY = "$schema";
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const ERROR_RESPONSE_SCHEMA_NAME = "ErrorResponse";

export const ERROR_RESPONSE_REF = `#/components/schemas/${ERROR_RESPONSE_SCHEMA_NAME}`;

export const toRequestJsonSchema = (schema: ZodType): OpenApiSchema =>
  Object.fromEntries(
    Object.entries(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" })).filter(
      ([key]) => key !== JSON_SCHEMA_DIALECT_KEY,
    ),
  );

const isJsonSchemaObject = (value: unknown): value is OpenApiSchema =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const toParametersFromObjectSchema = (
  objectSchema: OpenApiSchema,
  location: "path" | "query",
): OpenApiParameter[] => {
  const requiredNames = new Set(objectSchema.required ?? []);
  return Object.entries(objectSchema.properties ?? {}).map(([name, propertySchema]) => {
    const schema = isJsonSchemaObject(propertySchema) ? propertySchema : {};
    const { description, ...schemaWithoutDescription } = schema;
    return {
      name,
      in: location,
      required: location === "path" || requiredNames.has(name),
      ...(typeof description === "string" ? { description } : {}),
      schema: schemaWithoutDescription,
    };
  });
};

const inferStringSchema = (example: string): OpenApiSchema =>
  ISO_DATE_TIME_PATTERN.test(example)
    ? { type: "string", format: "date-time" }
    : { type: "string" };

export const inferSchemaFromExample = (example: JsonValue): OpenApiSchema => {
  if (example === null) return { type: "null" };
  if (typeof example === "string") return inferStringSchema(example);
  if (typeof example === "boolean") return { type: "boolean" };
  if (typeof example === "number") {
    return Number.isInteger(example) ? { type: "integer" } : { type: "number" };
  }
  if (Array.isArray(example)) {
    const [firstEntry] = example;
    return firstEntry === undefined
      ? { type: "array", items: {} }
      : { type: "array", items: inferSchemaFromExample(firstEntry) };
  }
  return {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(example).map(([key, value]) => [key, inferSchemaFromExample(value)]),
    ),
  };
};

export const toSuccessEnvelopeSchema = (dataSchema: OpenApiSchema): OpenApiSchema => ({
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", const: true },
    message: { type: "string" },
    data: dataSchema,
  },
});

export const errorResponseSchemas: Record<string, OpenApiSchema> = {
  [ERROR_RESPONSE_SCHEMA_NAME]: {
    type: "object",
    required: ["success", "message", "code"],
    properties: {
      success: { type: "boolean", const: false },
      message: { type: "string", description: "A short, safe message you can show to a person." },
      code: { type: "string", description: "A stable error code, like VALIDATION_ERROR." },
      details: { description: "Extra detail. For VALIDATION_ERROR, the list of field problems." },
    },
  },
};
