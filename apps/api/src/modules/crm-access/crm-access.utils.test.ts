import { describe, expect, it } from "vitest";

import { extractSubdomain } from "./crm-access.utils.js";

describe("extractSubdomain", () => {
  it("extracts a valid subdomain ahead of the base domain", () => {
    expect(extractSubdomain("acme-corp.localhost", "localhost")).toBe("acme-corp");
    expect(extractSubdomain("acme-corp.outfiqe.com", "outfiqe.com")).toBe("acme-corp");
  });

  it("is case-insensitive on both the host and the base domain", () => {
    expect(extractSubdomain("Acme-Corp.LOCALHOST", "localhost")).toBe("acme-corp");
  });

  it("strips a port from the host before matching", () => {
    expect(extractSubdomain("acme-corp.localhost:4000", "localhost")).toBe("acme-corp");
  });

  it("returns null for the bare base domain with no subdomain", () => {
    expect(extractSubdomain("localhost", "localhost")).toBeNull();
    expect(extractSubdomain("localhost:4000", "localhost")).toBeNull();
  });

  it("returns null for a host that doesn't belong to the base domain at all", () => {
    expect(extractSubdomain("evil.example.com", "localhost")).toBeNull();
  });

  it("returns null for a reserved subdomain", () => {
    expect(extractSubdomain("www.localhost", "localhost")).toBeNull();
    expect(extractSubdomain("api.localhost", "localhost")).toBeNull();
  });

  it("returns null for a malformed subdomain label", () => {
    expect(extractSubdomain("-bad.localhost", "localhost")).toBeNull();
    expect(extractSubdomain("multi.level.localhost", "localhost")).toBeNull();
  });
});
