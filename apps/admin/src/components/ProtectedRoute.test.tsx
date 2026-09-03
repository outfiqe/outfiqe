import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const useAuthMock = vi.fn();

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

import { ProtectedRoute } from "./ProtectedRoute";

const authState = (status: "loading" | "signed-out" | "signed-in") => ({
  state: { status },
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

  it("shows a loading placeholder while the session is still resolving", () => {
    const fakeLocation = {
      href: "http://localhost:3000/crm",
      pathname: "/crm",
      search: "",
      hostname: "localhost",
    };
    vi.stubGlobal("location", fakeLocation);
    useAuthMock.mockReturnValue(authState("loading"));

    render(
      <ProtectedRoute>
        <p>Secret dashboard</p>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
    expect(fakeLocation.href).toBe("http://localhost:3000/crm");
  });

  it("redirects a signed-out visitor to the web login with a return path", () => {
    const fakeLocation = {
      href: "http://admin.outfiqe.local:3000/crm/contacts",
      pathname: "/crm/contacts",
      search: "?tab=leads",
      hostname: "admin.outfiqe.local",
    };
    vi.stubGlobal("location", fakeLocation);
    useAuthMock.mockReturnValue(authState("signed-out"));

    render(
      <ProtectedRoute>
        <p>Secret dashboard</p>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Redirecting to sign in…")).toBeInTheDocument();
    expect(fakeLocation.href).toMatch(
      /^https?:\/\/[^/]+\/login\?redirect=%2Fcrm%2Fcontacts%3Ftab%3Dleads$/,
    );
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
  });
});
