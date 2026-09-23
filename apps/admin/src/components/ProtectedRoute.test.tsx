import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const useAuthMock = vi.fn();

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import { ProtectedRoute } from "./ProtectedRoute";

const authState = (
  status: "loading" | "signed-out" | "signed-in",
  reason: "session-ended" | "user-signed-out" | "impersonation-code-invalid" = "session-ended",
) => ({
  state: status === "signed-out" ? { status, reason } : { status },
});

describe("admin ProtectedRoute", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders the protected content for a signed-in session", () => {
    useAuthMock.mockReturnValue(authState("signed-in"));

    render(
      <ProtectedRoute>
        <p>Secret dashboard</p>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Secret dashboard")).toBeInTheDocument();
  });

  it("renders nothing while the session is still resolving, leaving the page loader in place", () => {
    const fakeLocation = {
      href: "http://localhost:3000/crm",
      pathname: "/crm",
      search: "",
      hostname: "localhost",
    };
    vi.stubGlobal("location", fakeLocation);
    useAuthMock.mockReturnValue(authState("loading"));

    const { container } = render(
      <ProtectedRoute>
        <p>Secret dashboard</p>
      </ProtectedRoute>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
    expect(fakeLocation.href).toBe("http://localhost:3000/crm");
  });

  it("redirects a session that ended unexpectedly to the web login with a return path", () => {
    const fakeLocation = {
      href: "http://admin.outfiqe.local:3000/crm/contacts",
      pathname: "/crm/contacts",
      search: "?tab=leads",
      hostname: "admin.outfiqe.local",
    };
    vi.stubGlobal("location", fakeLocation);
    useAuthMock.mockReturnValue(authState("signed-out", "session-ended"));

    const { container } = render(
      <ProtectedRoute>
        <p>Secret dashboard</p>
      </ProtectedRoute>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(fakeLocation.href).toMatch(
      /^https?:\/\/[^/]+\/login\?redirect=%2Fcrm%2Fcontacts%3Ftab%3Dleads$/,
    );
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
  });

  it("sends a visitor who chose to sign out to the web login with no return path", () => {
    const fakeLocation = {
      href: "http://admin.outfiqe.local:3000/platform/metrics",
      pathname: "/platform/metrics",
      search: "",
      hostname: "admin.outfiqe.local",
    };
    vi.stubGlobal("location", fakeLocation);
    useAuthMock.mockReturnValue(authState("signed-out", "user-signed-out"));

    render(
      <ProtectedRoute>
        <p>Secret dashboard</p>
      </ProtectedRoute>,
    );

    expect(fakeLocation.href).toMatch(/^https?:\/\/[^/]+\/login$/);
    expect(screen.getByRole("status")).toHaveTextContent("Redirecting to login…");
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
  });

  it("explains an expired hand-off link instead of bouncing to the web login", () => {
    const fakeLocation = {
      href: "http://studio.outfiqe.local:3000/crm?impersonation_code=stale",
      pathname: "/crm",
      search: "?impersonation_code=stale",
      hostname: "studio.outfiqe.local",
    };
    vi.stubGlobal("location", fakeLocation);
    useAuthMock.mockReturnValue(authState("signed-out", "impersonation-code-invalid"));

    render(
      <ProtectedRoute>
        <p>Secret dashboard</p>
      </ProtectedRoute>,
    );

    expect(fakeLocation.href).toBe("http://studio.outfiqe.local:3000/crm?impersonation_code=stale");
    expect(
      screen.getByText("This support link has expired or was already used."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
  });
});
