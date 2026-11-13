import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildOpenApiDocument } from "./openapi.builder.js";
import type { RecordedEndpoint, RecordedHandler } from "./openapi.types.js";

const ROLES_SOURCE_FILE = "modules/crm-access/crm-access.routes.ts";

const handler = (name: string, docs?: RecordedHandler["docs"]): RecordedHandler => ({ name, docs });

const createRoleEndpoint: RecordedEndpoint = {
  method: "post",
  expressPath: "/api/crm/roles/:organizationId",
  sourceFile: ROLES_SOURCE_FILE,
  handlers: [
    handler("jsonParser"),
    handler("resolveTenant", { kind: "tenant" }),
    handler("requireAuth", { kind: "auth", isRequired: true }),
    handler("enforcePermission", { kind: "crm-permission", acceptedKeys: ["roles:manage"] }),
    handler("enforceRateLimit", { kind: "rate-limit", windowMs: 3_600_000, max: 40 }),
    handler("requireIdempotencyKey", { kind: "idempotency" }),
    handler("validateRequest", {
      kind: "validation",
      schemas: {
        params: z.object({ organizationId: z.uuid() }),
        query: z.object({ dryRun: z.enum(["true", "false"]).optional() }),
        body: z.object({ name: z.string().min(2), permissionKeys: z.array(z.string()) }),
      },
    }),
    handler("createRole"),
  ],
};

const publicListEndpoint: RecordedEndpoint = {
  method: "get",
  expressPath: "/api/delivery-zones",
  sourceFile: "modules/delivery-zones/delivery-zone.routes.ts",
  handlers: [handler("optionalAuth", { kind: "auth", isRequired: false }), handler("list")],
};

const uploadEndpoint: RecordedEndpoint = {
  method: "post",
  expressPath: "/api/uploads",
  sourceFile: "modules/uploads/upload.routes.ts",
  handlers: [handler("requireAuth", { kind: "auth", isRequired: true }), handler("handleUpload")],
};

const healthEndpoint: RecordedEndpoint = {
  method: "get",
  expressPath: "/health",
  sourceFile: "app.ts",
  handlers: [handler("<anonymous>")],
};

const buildDocument = () =>
  buildOpenApiDocument([uploadEndpoint, createRoleEndpoint, publicListEndpoint, healthEndpoint], {
    "GET /api/delivery-zones": [
      {
        status: 200,
        query: {},
        requestBody: null,
        responseBody: { success: true, message: "Delivery zones.", data: [{ name: "Kathmandu" }] },
      },
    ],
  });

describe("buildOpenApiDocument", () => {
  it("documents only /api routes, grouped by module tag", () => {
    const openApiDocument = buildDocument();
    expect(Object.keys(openApiDocument.paths)).toEqual([
      "/api/crm/roles/{organizationId}",
      "/api/delivery-zones",
      "/api/uploads",
    ]);
    expect(openApiDocument.tags.map(({ name }) => name)).toEqual([
      "CRM access",
      "Delivery zones",
      "Uploads",
    ]);
  });

  it("turns guards and zod schemas into security, parameters, body and errors", () => {
    const createRole = buildDocument().paths["/api/crm/roles/{organizationId}"]?.post;

    expect(createRole?.security).toEqual([{ bearerAuth: [] }]);
    expect(
      createRole?.parameters.map(({ name, in: location, required }) => [name, location, required]),
    ).toEqual([
      ["organizationId", "path", true],
      ["dryRun", "query", false],
      ["X-Forwarded-Host", "header", false],
      ["Idempotency-Key", "header", true],
    ]);
    expect(createRole?.requestBody?.content["application/json"]?.schema.required).toEqual([
      "name",
      "permissionKeys",
    ]);
    expect(Object.keys(createRole?.responses ?? {})).toEqual([
      "200",
      "400",
      "401",
      "403",
      "404",
      "422",
      "429",
    ]);
    expect(createRole?.description).toContain("CRM permission: `roles:manage`.");
    expect(createRole?.description).toContain("Rate limit: 40 requests per 1 hour.");
  });

  it("uses recorded examples for the success response and marks optional sign-in", () => {
    const listZones = buildDocument().paths["/api/delivery-zones"]?.get;
    const successContent = listZones?.responses["200"]?.content?.["application/json"];

    expect(listZones?.security).toEqual([{}, { bearerAuth: [] }]);
    expect(successContent?.example).toMatchObject({ data: [{ name: "Kathmandu" }] });
    expect(successContent?.schema.properties?.data).toEqual({
      type: "array",
      items: { type: "object", properties: { name: { type: "string" } } },
    });
  });

  it("describes file uploads as multipart form data", () => {
    const upload = buildDocument().paths["/api/uploads"]?.post;
    expect(upload?.requestBody?.content["multipart/form-data"]?.schema).toMatchObject({
      required: ["files"],
      properties: { files: { type: "array" } },
    });
  });
});
