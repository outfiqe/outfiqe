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

  it("lets checkout POST its payment form to eSewa (sandbox and production hosts)", () => {
    const csp = buildContentSecurityPolicy(baseOptions);
    expect(csp).toContain(
      "form-action 'self' https://epay.esewa.com.np https://rc-epay.esewa.com.np",
    );
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

  it("allows the theme init script by hash in dev and prod so it needs no nonce", () => {
    expect(buildContentSecurityPolicy({ ...baseOptions, isDev: false })).toMatch(
      /script-src[^;]*'sha256-[A-Za-z0-9+/=]+'/,
    );
    expect(buildContentSecurityPolicy({ ...baseOptions, isDev: true })).toMatch(
      /script-src[^;]*'sha256-[A-Za-z0-9+/=]+'/,
    );
  });

  it("uses an inline-friendly script-src with no nonce or strict-dynamic for static pages", () => {
    const csp = buildContentSecurityPolicy({ ...baseOptions, renderMode: "static" });
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'");
    expect(csp).not.toContain("'nonce-");
    expect(csp).not.toContain("'strict-dynamic'");
  });

  it("still allows 'unsafe-eval' on static pages in dev, so Turbopack HMR doesn't break there", () => {
    const devStaticCsp = buildContentSecurityPolicy({
      ...baseOptions,
      isDev: true,
      renderMode: "static",
    });
    expect(devStaticCsp).toMatch(/ 'unsafe-eval'/);

    const prodStaticCsp = buildContentSecurityPolicy({
      ...baseOptions,
      isDev: false,
      renderMode: "static",
    });
    expect(prodStaticCsp).not.toMatch(/ 'unsafe-eval'/);
  });
});
