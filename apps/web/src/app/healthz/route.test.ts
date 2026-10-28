import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /healthz", () => {
  it("answers ok without rendering anything", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("is never cached, so a check always reaches a live function", () => {
    expect(GET().headers.get("Cache-Control")).toBe("no-store");
  });
});
