import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, toWebSocketOrigin } from "./contentSecurityPolicy";

describe("toWebSocketOrigin", () => {
  it("converts an http origin to ws", () => {
    expect(toWebSocketOrigin("http://localhost:4000")).toBe("ws://localhost:4000");
  });

  it("converts an https origin to wss", () => {
    expect(toWebSocketOrigin("https://api.outfiqe.com")).toBe("wss://api.outfiqe.com");
  });
});

describe("buildContentSecurityPolicy", () => {
  const baseOptions = {
    nonce: "test-nonce",
    isDev: false,
    isProduction: false,
    apiOrigin: "http://localhost:4000",
  };

  it("allows the api origin in img-src", () => {
    const csp = buildContentSecurityPolicy(baseOptions);
    expect(csp).toContain("img-src 'self' data: blob: https: http://localhost:4000");
  });

  it("allows the api origin and its websocket equivalent in connect-src", () => {
    const csp = buildContentSecurityPolicy(baseOptions);
    expect(csp).toContain("connect-src 'self' http://localhost:4000 ws://localhost:4000");
  });

  it("carries a production https api origin through as-is", () => {
    const csp = buildContentSecurityPolicy({
      ...baseOptions,
      isProduction: true,
      apiOrigin: "https://api.outfiqe.com",
    });
    expect(csp).toContain("connect-src 'self' https://api.outfiqe.com wss://api.outfiqe.com");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("allows full 'unsafe-eval' only in dev", () => {
    expect(buildContentSecurityPolicy({ ...baseOptions, isDev: true })).toMatch(/ 'unsafe-eval'/);
    expect(buildContentSecurityPolicy({ ...baseOptions, isDev: false })).not.toMatch(
      / 'unsafe-eval'/,
    );
  });

  it("permits wasm image decoders outside dev via 'wasm-unsafe-eval' and blob workers", () => {
    const csp = buildContentSecurityPolicy({ ...baseOptions, isDev: false });
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("worker-src 'self' blob:");
  });

  it("keeps blob workers allowed in dev so HEIC conversion runs there too", () => {
    expect(buildContentSecurityPolicy({ ...baseOptions, isDev: true })).toContain(
      "worker-src 'self' blob:",
    );
  });

  it("uses 'strict-dynamic' outside dev, but drops it in dev so same-origin HMR chunks load", () => {
    expect(buildContentSecurityPolicy({ ...baseOptions, isDev: false })).toContain(
      "'strict-dynamic'",
    );
    expect(buildContentSecurityPolicy({ ...baseOptions, isDev: true })).not.toContain(
      "'strict-dynamic'",
    );
  });

  it("embeds the given nonce in script-src", () => {
    const csp = buildContentSecurityPolicy({ ...baseOptions, nonce: "abc123" });
    expect(csp).toContain("'nonce-abc123'");
  });
});
