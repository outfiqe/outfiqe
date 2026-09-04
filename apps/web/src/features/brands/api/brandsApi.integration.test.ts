import { mswServer } from "@test/integration/msw/server";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { brandsApi } from "./brandsApi";

const page = { brands: [], nextCursor: null, total: 0 };
const ok = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

describe("brandsApi.list", () => {
  it("requests the first page with no query params", async () => {
    let url: URL | undefined;
    mswServer.use(
      http.get("/api/brands", ({ request }) => {
        url = new URL(request.url);
        return ok(page);
      }),
    );

    await brandsApi.list();

    expect([...(url?.searchParams.keys() ?? [])]).toEqual([]);
  });

  it("forwards the cursor and limit when both are given", async () => {
    let url: URL | undefined;
    mswServer.use(
      http.get("/api/brands", ({ request }) => {
        url = new URL(request.url);
        return ok(page);
      }),
    );

    await brandsApi.list("cursor-3", 12);

    expect(url?.searchParams.get("cursor")).toBe("cursor-3");
    expect(url?.searchParams.get("limit")).toBe("12");
  });
});
