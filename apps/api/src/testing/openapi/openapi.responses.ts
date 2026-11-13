import { STATUS_CODES } from "node:http";

import { HTTP_STATUS } from "#constants/http.constants.js";

import {
  ERROR_RESPONSE_REF,
  inferSchemaFromExample,
  toSuccessEnvelopeSchema,
} from "./openapi.schemas.js";
import type {
  EndpointExample,
  GuardError,
  JsonValue,
  OpenApiNamedExample,
  OpenApiResponse,
} from "./openapi.types.js";

const JSON_CONTENT_TYPE = "application/json";
const FIRST_ERROR_STATUS = HTTP_STATUS.BAD_REQUEST;
const DEFAULT_SUCCESS_STATUS = String(HTTP_STATUS.OK);
const UNRECORDED_DATA_DESCRIPTION =
  "No integration test records this response yet, so only the envelope is shown.";

const VALIDATION_ERROR: GuardError = {
  status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  code: "VALIDATION_ERROR",
  message: "Invalid request",
  details: [
    {
      code: "invalid_type",
      expected: "string",
      path: ["name"],
      message: "Invalid input: expected string, received undefined",
    },
  ],
};

const describeStatus = (status: number): string => STATUS_CODES[status] ?? `Status ${status}`;

const readResponseData = (responseBody: JsonValue): JsonValue =>
  typeof responseBody === "object" &&
  responseBody !== null &&
  !Array.isArray(responseBody) &&
  "data" in responseBody
    ? (responseBody.data ?? null)
    : responseBody;

const readErrorCode = (responseBody: JsonValue, status: number): string =>
  typeof responseBody === "object" &&
  responseBody !== null &&
  !Array.isArray(responseBody) &&
  typeof responseBody.code === "string"
    ? responseBody.code
    : describeStatus(status);

const readErrorMessage = (responseBody: JsonValue, fallback: string): string =>
  typeof responseBody === "object" &&
  responseBody !== null &&
  !Array.isArray(responseBody) &&
  typeof responseBody.message === "string"
    ? responseBody.message
    : fallback;

const toGuardErrorBody = ({ code, message, details }: GuardError): JsonValue => ({
  success: false,
  message,
  code,
  ...(details === undefined ? {} : { details }),
});

const buildSuccessResponses = (successExamples: EndpointExample[]) => {
  if (successExamples.length === 0) {
    return {
      [DEFAULT_SUCCESS_STATUS]: {
        description: describeStatus(HTTP_STATUS.OK),
        content: {
          [JSON_CONTENT_TYPE]: {
            schema: toSuccessEnvelopeSchema({ description: UNRECORDED_DATA_DESCRIPTION }),
          },
        },
      },
    };
  }

  return Object.fromEntries(
    successExamples.map(({ status, responseBody }) => [
      String(status),
      {
        description: describeStatus(status),
        content: {
          [JSON_CONTENT_TYPE]: {
            schema: toSuccessEnvelopeSchema(inferSchemaFromExample(readResponseData(responseBody))),
            example: responseBody,
          },
        },
      },
    ]),
  );
};

const collectErrorExamples = (
  errorExamples: EndpointExample[],
  guardErrors: GuardError[],
  hasValidation: boolean,
): Map<number, Map<string, OpenApiNamedExample>> => {
  const examplesByStatus = new Map<number, Map<string, OpenApiNamedExample>>();
  const addExample = (status: number, code: string, namedExample: OpenApiNamedExample) => {
    const examplesForStatus = examplesByStatus.get(status) ?? new Map();
    if (!examplesForStatus.has(code)) examplesForStatus.set(code, namedExample);
    examplesByStatus.set(status, examplesForStatus);
  };

  for (const { status, responseBody } of errorExamples) {
    addExample(status, readErrorCode(responseBody, status), {
      summary: readErrorMessage(responseBody, describeStatus(status)),
      value: responseBody,
    });
  }
  for (const guardError of [...(hasValidation ? [VALIDATION_ERROR] : []), ...guardErrors]) {
    addExample(guardError.status, guardError.code, {
      summary: guardError.message,
      value: toGuardErrorBody(guardError),
    });
  }
  return examplesByStatus;
};

export const buildOperationResponses = (
  examples: EndpointExample[],
  guardErrors: GuardError[],
  hasValidation: boolean,
): Record<string, OpenApiResponse> => {
  const successExamples = examples.filter(({ status }) => status < FIRST_ERROR_STATUS);
  const errorExamples = examples.filter(({ status }) => status >= FIRST_ERROR_STATUS);
  const examplesByStatus = collectErrorExamples(errorExamples, guardErrors, hasValidation);

  const errorResponses = [...examplesByStatus.entries()]
    .sort(([firstStatus], [secondStatus]) => firstStatus - secondStatus)
    .map(([status, namedExamples]) => [
      String(status),
      {
        description: describeStatus(status),
        content: {
          [JSON_CONTENT_TYPE]: {
            schema: { $ref: ERROR_RESPONSE_REF },
            examples: Object.fromEntries(namedExamples),
          },
        },
      },
    ]);

  return { ...buildSuccessResponses(successExamples), ...Object.fromEntries(errorResponses) };
};
