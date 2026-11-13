import { formatDuration } from "date-fns/formatDuration";
import { intervalToDuration } from "date-fns/intervalToDuration";

import { HTTP_STATUS, IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import type { RouteDocsInfo } from "#types/route-docs.types.js";

import type {
  GuardError,
  OpenApiParameter,
  OperationAccess,
  RecordedHandler,
} from "./openapi.types.js";

type NamedGuardDocs = { accessNote: string; guardError?: GuardError; header?: OpenApiParameter };

const DURATION_START = 0;
const FORBIDDEN_ERROR: GuardError = {
  status: HTTP_STATUS.FORBIDDEN,
  code: "FORBIDDEN",
  message: "You do not have permission to do this.",
};
const MULTIPART_HANDLER_NAMES = new Set(["handleUpload", "handleIconImageUpload"]);

const SINGLE_KEY_COUNT = 1;

const formatCodeList = (keys: readonly string[]): string =>
  keys.map((key) => `\`${key}\``).join(", ");

const formatAcceptedKeys = (keys: readonly string[]): string =>
  keys.length > SINGLE_KEY_COUNT ? `any one of ${formatCodeList(keys)}` : formatCodeList(keys);

const formatRateLimitWindow = (windowMs: number): string =>
  formatDuration(intervalToDuration({ start: DURATION_START, end: windowMs }));

const NAMED_GUARD_DOCS: Record<string, NamedGuardDocs> = {
  requireActiveAccount: {
    accessNote: "The account must not be suspended.",
    guardError: {
      status: HTTP_STATUS.FORBIDDEN,
      code: "ACCOUNT_SUSPENDED",
      message: "This account has been suspended.",
    },
  },
  requireCsrfHeader: {
    accessNote:
      "Browser sessions that send the refresh-token cookie must also send the `X-CSRF-Token` header. " +
      "Calls that only send a Bearer token can leave it out.",
    guardError: {
      status: HTTP_STATUS.FORBIDDEN,
      code: "CSRF_MISMATCH",
      message: "This request could not be verified. Please retry.",
    },
    header: {
      name: "X-CSRF-Token",
      in: "header",
      required: false,
      description: "The value of the CSRF cookie. Only needed with the refresh-token cookie.",
      schema: { type: "string" },
    },
  },
  enforceCoFounder: {
    accessNote: "Co-founders only.",
    guardError: FORBIDDEN_ERROR,
  },
  requireAdvancedCrmFeatures: {
    accessNote: "The organization needs an active CRM subscription or trial.",
    guardError: {
      status: HTTP_STATUS.PAYMENT_REQUIRED,
      code: "ADVANCED_FEATURES_LOCKED",
      message: "This feature needs an active CRM subscription. Your trial has ended.",
    },
  },
  rawParser: {
    accessNote: "Send the raw request body exactly as signed. The signature is checked on it.",
  },
};

const TENANT_HOST_HEADER: OpenApiParameter = {
  name: "X-Forwarded-Host",
  in: "header",
  required: false,
  description:
    "The organization's CRM host, like `meridian.outfiqe.com`. Leave it out to use the platform's own CRM.",
  schema: { type: "string" },
};

const IDEMPOTENCY_KEY_HEADER: OpenApiParameter = {
  name: IDEMPOTENCY_HEADER,
  in: "header",
  required: true,
  description: "A new unique value for each action, so a retry never runs it twice.",
  schema: { type: "string", pattern: "^[A-Za-z0-9_-]{8,128}$" },
};

const describeGuardAccess = (docs: RouteDocsInfo): Omit<NamedGuardDocs, "header"> | undefined => {
  switch (docs.kind) {
    case "role":
      return {
        accessNote: `Account role: ${formatCodeList(docs.roles)}.`,
        guardError: FORBIDDEN_ERROR,
      };
    case "crm-permission":
      return {
        accessNote: `CRM permission: ${formatAcceptedKeys(docs.acceptedKeys)}.`,
        guardError: FORBIDDEN_ERROR,
      };
    case "platform-permission":
      return docs.acceptedKeys.length === 0
        ? { accessNote: "Platform staff only.", guardError: FORBIDDEN_ERROR }
        : {
            accessNote: `Platform permission: ${formatAcceptedKeys(docs.acceptedKeys)}.`,
            guardError: FORBIDDEN_ERROR,
          };
    case "tenant":
      return {
        accessNote: "Runs inside one CRM organization, picked from the request's host.",
        guardError: {
          status: HTTP_STATUS.NOT_FOUND,
          code: "ORGANIZATION_NOT_FOUND",
          message: "No CRM organization is configured.",
        },
      };
    case "rate-limit":
      return {
        accessNote: `Rate limit: ${docs.max} requests per ${formatRateLimitWindow(docs.windowMs)}.`,
        guardError: {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
      };
    case "idempotency":
      return {
        accessNote: `Needs an \`${IDEMPOTENCY_HEADER}\` header.`,
        guardError: {
          status: HTTP_STATUS.BAD_REQUEST,
          code: "IDEMPOTENCY_KEY_REQUIRED",
          message: `Send a unique ${IDEMPOTENCY_HEADER} header (8 to 128 letters, numbers, - or _) with this request.`,
        },
      };
    case "feature-flag":
      return {
        accessNote: `Only works while the \`${docs.key}\` feature switch is on for the caller.`,
        guardError: {
          status: HTTP_STATUS.NOT_FOUND,
          code: "FEATURE_NOT_AVAILABLE",
          message: "Not found.",
        },
      };
    case "auth":
    case "validation":
      return undefined;
  }
};

const readAuthRequirement = (handlers: RecordedHandler[]): OperationAccess["authRequirement"] => {
  const authDocs = handlers.flatMap(({ docs }) => (docs?.kind === "auth" ? [docs] : []));
  if (authDocs.some(({ isRequired }) => isRequired)) return "required";
  return authDocs.length > 0 ? "optional" : "none";
};

const readHeaderParameters = (handlers: RecordedHandler[]): OpenApiParameter[] => {
  const headers = handlers.flatMap(({ name, docs }) => {
    if (docs?.kind === "tenant") return [TENANT_HOST_HEADER];
    if (docs?.kind === "idempotency") return [IDEMPOTENCY_KEY_HEADER];
    const namedHeader = NAMED_GUARD_DOCS[name]?.header;
    return namedHeader ? [namedHeader] : [];
  });
  return [...new Map(headers.map((header) => [header.name, header])).values()];
};

const AUTH_REQUIRED_ERROR: GuardError = {
  status: HTTP_STATUS.UNAUTHORIZED,
  code: "UNAUTHORIZED",
  message: "Authentication required.",
};

export const describeOperationAccess = (handlers: RecordedHandler[]): OperationAccess => {
  const authRequirement = readAuthRequirement(handlers);
  const guardDescriptions = handlers.flatMap(({ name, docs }) => {
    const description = docs ? describeGuardAccess(docs) : NAMED_GUARD_DOCS[name];
    return description ? [description] : [];
  });
  const guardErrors = [
    ...(authRequirement === "required" ? [AUTH_REQUIRED_ERROR] : []),
    ...guardDescriptions.flatMap(({ guardError }) => (guardError ? [guardError] : [])),
  ];

  return {
    authRequirement,
    accessNotes: [...new Set(guardDescriptions.map(({ accessNote }) => accessNote))],
    headerParameters: readHeaderParameters(handlers),
    guardErrors: [...new Map(guardErrors.map((error) => [error.code, error])).values()],
    isMultipart: handlers.some(({ name }) => MULTIPART_HANDLER_NAMES.has(name)),
  };
};
