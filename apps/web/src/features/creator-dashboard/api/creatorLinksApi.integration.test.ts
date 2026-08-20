import { mswServer } from "@test/integration/msw/server";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { creatorLinksApi } from "./creatorLinksApi";

describe("creatorLinksApi.recordClick", () => {
  it("records the click and returns the redirect target", async () => {
    mswServer.use(
      http.post("/api/creator-links/token-abc/click", async ({ request }) => {
        const body = (await request.json()) as { sessionId: string };
        expect(typeof body.sessionId).toBe("string");
        return HttpResponse.json({
          success: true,
          message: "Recorded.",
          data: { targetUrl: "https://outfiqe.test/product/product-1" },
        });
      }),
    );

    const result = await creatorLinksApi.recordClick("token-abc");

    expect(result).toEqual({ targetUrl: "https://outfiqe.test/product/product-1" });
  });
});
