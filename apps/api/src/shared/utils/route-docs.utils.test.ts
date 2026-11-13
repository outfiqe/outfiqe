import { describe, expect, it } from "vitest";
import { z } from "zod";

import { describeRouteHandler, readRouteHandlerDocs } from "./route-docs.utils.js";

const passThrough = () => undefined;

describe("describeRouteHandler / readRouteHandlerDocs", () => {
  it("returns the same handler it was given, so call sites keep working", () => {
    const handler = () => undefined;

    expect(describeRouteHandler(handler, { kind: "idempotency" })).toBe(handler);
  });

  it("reads back what was described for that exact handler", () => {
    const bodySchema = z.object({ name: z.string() });
    const handler = describeRouteHandler(() => undefined, {
      kind: "validation",
      schemas: { body: bodySchema },
    });

    expect(readRouteHandlerDocs(handler)).toEqual({
      kind: "validation",
      schemas: { body: bodySchema },
    });
  });

  it("keeps each handler's description separate", () => {
    const signedIn = describeRouteHandler(() => undefined, { kind: "auth", isRequired: true });
    const optional = describeRouteHandler(() => undefined, { kind: "auth", isRequired: false });

    expect(readRouteHandlerDocs(signedIn)).toEqual({ kind: "auth", isRequired: true });
    expect(readRouteHandlerDocs(optional)).toEqual({ kind: "auth", isRequired: false });
  });

  it("returns nothing for handlers that were never described", () => {
    expect(readRouteHandlerDocs(passThrough)).toBeUndefined();
  });

  it("returns nothing for values that aren't functions", () => {
    expect(readRouteHandlerDocs("requireAuth")).toBeUndefined();
    expect(readRouteHandlerDocs(undefined)).toBeUndefined();
  });
});
