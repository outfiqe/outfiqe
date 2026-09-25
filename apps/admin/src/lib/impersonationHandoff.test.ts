import { afterEach, describe, expect, it } from "vitest";

import {
  buildImpersonationHandoffUrl,
  IMPERSONATION_CODE_QUERY_PARAM,
} from "./impersonationHandoff";

const BASE_DOMAIN = import.meta.env.VITE_TENANT_BASE_DOMAIN ?? "localhost";
const originalLocation = window.location;

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
});

describe("buildImpersonationHandoffUrl", () => {
  it("points at the tenant's own CRM route with the one-time code in the query string", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        protocol: "https:",
        port: "",
        hostname: `admin.${BASE_DOMAIN}`,
      },
    });

    const url = buildImpersonationHandoffUrl("studio", "one-time-code");

    expect(url).toBe(
      `https://studio.${BASE_DOMAIN}/admin/crm?${IMPERSONATION_CODE_QUERY_PARAM}=one-time-code`,
    );
  });
});
