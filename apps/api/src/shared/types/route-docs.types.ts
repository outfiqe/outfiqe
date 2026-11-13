import type { ZodType } from "zod";

export type RouteValidationSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export type RouteDocsInfo =
  | { kind: "validation"; schemas: RouteValidationSchemas }
  | { kind: "auth"; isRequired: boolean }
  | { kind: "role"; roles: readonly string[] }
  | { kind: "crm-permission"; acceptedKeys: readonly string[] }
  | { kind: "platform-permission"; acceptedKeys: readonly string[] }
  | { kind: "tenant" }
  | { kind: "rate-limit"; windowMs: number; max: number }
  | { kind: "idempotency" }
  | { kind: "feature-flag"; key: string };

export type RouteDocsKind = RouteDocsInfo["kind"];
