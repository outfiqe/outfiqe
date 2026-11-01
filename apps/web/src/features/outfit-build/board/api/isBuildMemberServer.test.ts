import { beforeEach, describe, expect, it, vi } from "vitest";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { isBuildMemberServer } from "./isBuildMemberServer";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/lib/serverApiClient", () => ({ serverApiRequest: vi.fn() }));

const ACCESS_TOKEN = "access-token";

describe("isBuildMemberServer", () => {
  beforeEach(() => {
    vi.mocked(serverApiRequest).mockReset();
  });

  it("treats someone who gets the live board as part of the build", async () => {
    vi.mocked(serverApiRequest).mockResolvedValue({ kind: "board" });

    await expect(isBuildMemberServer("build-board", ACCESS_TOKEN)).resolves.toBe(true);
  });

  it("treats someone who only gets the published version as a visitor", async () => {
    vi.mocked(serverApiRequest).mockResolvedValue({ kind: "published" });

    await expect(isBuildMemberServer("build-published", ACCESS_TOKEN)).resolves.toBe(false);
  });

  it("treats a refused or failed request as a visitor", async () => {
    vi.mocked(serverApiRequest).mockRejectedValue(new Error("Not found"));

    await expect(isBuildMemberServer("build-refused", ACCESS_TOKEN)).resolves.toBe(false);
  });
});
