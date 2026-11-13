import type { RouteValidationSchemas } from "#types/route-docs.types.js";

import { describeOperationAccess } from "./openapi.access.js";
import { listPathParamNames, toOperationId, toOperationSummary } from "./openapi.naming.js";
import { buildOperationResponses } from "./openapi.responses.js";
import { toParametersFromObjectSchema, toRequestJsonSchema } from "./openapi.schemas.js";
import type {
  AuthRequirement,
  EndpointExample,
  OpenApiMediaType,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiSchema,
  OpenApiSecurityRequirement,
  RecordedEndpoint,
  RecordedHandler,
} from "./openapi.types.js";

type MultipartFileField = { fieldName: string; isMultiple: boolean };

const BEARER_SECURITY_SCHEME = "bearerAuth";
const SUCCESS_STATUS_LIMIT = 400;
const JSON_CONTENT_TYPE = "application/json";
const MULTIPART_CONTENT_TYPE = "multipart/form-data";
const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded";
const URLENCODED_HANDLER_NAME = "urlencodedParser";
const RAW_BODY_HANDLER_NAME = "rawParser";
const MULTIPART_FILE_FIELDS: Record<string, MultipartFileField> = {
  "modules/uploads/upload.routes.ts": { fieldName: "files", isMultiple: true },
};
const DEFAULT_MULTIPART_FILE_FIELD: MultipartFileField = { fieldName: "file", isMultiple: false };
const BINARY_FILE_SCHEMA: OpenApiSchema = { type: "string", format: "binary" };

const AUTH_SUMMARIES: Record<AuthRequirement, string> = {
  required: "Signed in. Send `Authorization: Bearer <access token>`.",
  optional: "Anyone. A Bearer token is optional and can change what comes back.",
  none: "Anyone. No sign-in needed.",
};

const SECURITY_BY_AUTH_REQUIREMENT: Record<AuthRequirement, OpenApiSecurityRequirement[]> = {
  required: [{ [BEARER_SECURITY_SCHEME]: [] }],
  optional: [{}, { [BEARER_SECURITY_SCHEME]: [] }],
  none: [],
};

const readValidationSchemas = (handlers: RecordedHandler[]): RouteValidationSchemas =>
  handlers.reduce<RouteValidationSchemas>(
    (mergedSchemas, { docs }) =>
      docs?.kind === "validation" ? { ...mergedSchemas, ...docs.schemas } : mergedSchemas,
    {},
  );

const buildPathParameters = (
  expressPath: string,
  paramsSchema: RouteValidationSchemas["params"],
): OpenApiParameter[] => {
  const validatedParameters = paramsSchema
    ? toParametersFromObjectSchema(toRequestJsonSchema(paramsSchema), "path")
    : [];
  const validatedNames = new Set(validatedParameters.map(({ name }) => name));
  const unvalidatedParameters = listPathParamNames(expressPath)
    .filter((name) => !validatedNames.has(name))
    .map((name): OpenApiParameter => ({
      name,
      in: "path",
      required: true,
      schema: { type: "string" },
    }));
  return [...validatedParameters, ...unvalidatedParameters];
};

const buildMultipartSchema = (
  sourceFile: string | undefined,
  bodySchema: OpenApiSchema | undefined,
): OpenApiSchema => {
  const { fieldName, isMultiple } =
    (sourceFile ? MULTIPART_FILE_FIELDS[sourceFile] : undefined) ?? DEFAULT_MULTIPART_FILE_FIELD;
  return {
    type: "object",
    required: [fieldName, ...(bodySchema?.required ?? [])],
    properties: {
      [fieldName]: isMultiple ? { type: "array", items: BINARY_FILE_SCHEMA } : BINARY_FILE_SCHEMA,
      ...bodySchema?.properties,
    },
  };
};

const pickRequestExample = (examples: EndpointExample[]) =>
  examples.find(
    ({ status, requestBody }) =>
      status < SUCCESS_STATUS_LIMIT && requestBody !== null && typeof requestBody === "object",
  )?.requestBody;

const buildRequestBody = (
  endpoint: RecordedEndpoint,
  bodySchema: OpenApiSchema | undefined,
  isMultipart: boolean,
  examples: EndpointExample[],
): OpenApiOperation["requestBody"] => {
  const handlerNames = new Set(endpoint.handlers.map(({ name }) => name));
  if (isMultipart) {
    const content = { schema: buildMultipartSchema(endpoint.sourceFile, bodySchema) };
    return { required: true, content: { [MULTIPART_CONTENT_TYPE]: content } };
  }
  if (handlerNames.has(RAW_BODY_HANDLER_NAME)) {
    return { required: true, content: { [JSON_CONTENT_TYPE]: { schema: bodySchema ?? {} } } };
  }
  if (!bodySchema) return undefined;

  const contentType = handlerNames.has(URLENCODED_HANDLER_NAME)
    ? FORM_CONTENT_TYPE
    : JSON_CONTENT_TYPE;
  const requestExample = pickRequestExample(examples);
  const mediaType: OpenApiMediaType = {
    schema: bodySchema,
    ...(requestExample === undefined ? {} : { example: requestExample }),
  };
  return { required: true, content: { [contentType]: mediaType } };
};

const buildDescription = (
  authRequirement: AuthRequirement,
  accessNotes: string[],
  sourceFile: string | undefined,
): string =>
  [
    `**Who can call it:** ${AUTH_SUMMARIES[authRequirement]}`,
    ...accessNotes.map((accessNote) => `- ${accessNote}`),
    ...(sourceFile ? [`\nDefined in \`apps/api/src/${sourceFile}\`.`] : []),
  ].join("\n");

export const buildOperation = (
  endpoint: RecordedEndpoint,
  openApiPath: string,
  tagName: string,
  examples: EndpointExample[],
): OpenApiOperation => {
  const { method, expressPath, handlers, sourceFile } = endpoint;
  const { authRequirement, accessNotes, headerParameters, guardErrors, isMultipart } =
    describeOperationAccess(handlers);
  const { body, params, query } = readValidationSchemas(handlers);
  const bodySchema = body ? toRequestJsonSchema(body) : undefined;
  const queryParameters = query
    ? toParametersFromObjectSchema(toRequestJsonSchema(query), "query")
    : [];
  const requestBody = buildRequestBody(endpoint, bodySchema, isMultipart, examples);

  return {
    operationId: toOperationId(method, openApiPath),
    summary: toOperationSummary(handlers.at(-1)?.name ?? "", openApiPath),
    description: buildDescription(authRequirement, accessNotes, sourceFile),
    tags: [tagName],
    security: SECURITY_BY_AUTH_REQUIREMENT[authRequirement],
    parameters: [
      ...buildPathParameters(expressPath, params),
      ...queryParameters,
      ...headerParameters,
    ],
    ...(requestBody ? { requestBody } : {}),
    responses: buildOperationResponses(examples, guardErrors, Boolean(body ?? params ?? query)),
  };
};
