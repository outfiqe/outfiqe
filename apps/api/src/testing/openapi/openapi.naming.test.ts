import { describe, expect, it } from "vitest";

import {
  humanizeIdentifier,
  listPathParamNames,
  toOpenApiPath,
  toOperationId,
  toOperationKey,
  toOperationSummary,
  toTagFolder,
  toTagName,
} from "./openapi.naming.js";

describe("humanizeIdentifier", () => {
  it("splits camelCase and kebab-case into a sentence", () => {
    expect(humanizeIdentifier("listMyOrders")).toBe("List my orders");
    expect(humanizeIdentifier("delivery-zones")).toBe("Delivery zones");
  });

  it("keeps known acronyms in capitals", () => {
    expect(humanizeIdentifier("crm-access")).toBe("CRM access");
    expect(humanizeIdentifier("bank-qr-verification")).toBe("Bank QR verification");
  });
});

describe("paths", () => {
  it("turns express params into OpenAPI params", () => {
    expect(toOpenApiPath("/api/orders/:orderId/items/:itemId")).toBe(
      "/api/orders/{orderId}/items/{itemId}",
    );
    expect(listPathParamNames("/api/orders/:orderId/items/:itemId")).toEqual(["orderId", "itemId"]);
  });

  it("builds stable operation keys and ids", () => {
    expect(toOperationKey("patch", "/api/delivery-zones/{zoneId}")).toBe(
      "PATCH /api/delivery-zones/{zoneId}",
    );
    expect(toOperationId("patch", "/api/delivery-zones/{zoneId}")).toBe(
      "patch-api-delivery-zones-zoneId",
    );
  });
});

describe("toOperationSummary", () => {
  it("uses a descriptive handler name as it is", () => {
    expect(toOperationSummary("listMyOrders", "/api/orders/mine")).toBe("List my orders");
  });

  it("adds the resource to a one-word handler name", () => {
    expect(toOperationSummary("list", "/api/delivery-zones")).toBe("List delivery zones");
    expect(toOperationSummary("update", "/api/delivery-zones/{zoneId}")).toBe(
      "Update delivery zone",
    );
    expect(toOperationSummary("remove", "/api/categories/{categoryId}")).toBe("Remove category");
  });

  it("does not repeat a resource the handler already names", () => {
    expect(toOperationSummary("upload", "/api/uploads")).toBe("Upload");
    expect(toOperationSummary("estimate", "/api/delivery-zones/estimate")).toBe("Estimate");
  });

  it("falls back to the resource for anonymous handlers", () => {
    expect(toOperationSummary("<anonymous>", "/api/health-checks")).toBe("Health checks");
  });
});

describe("tags", () => {
  it("names a tag after the module and its topic folder", () => {
    expect(toTagFolder("modules/crm-access/roles/role.routes.ts")).toBe("crm-access/roles");
    expect(toTagName("crm-access/roles")).toBe("CRM access roles");
    expect(toTagName("delivery-zones")).toBe("Delivery zones");
  });

  it("puts routes outside a module under Health", () => {
    expect(toTagFolder("app.ts")).toBeUndefined();
    expect(toTagFolder(undefined)).toBeUndefined();
    expect(toTagName(undefined)).toBe("Health");
  });
});
