import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthQueryClientWrapper } from "../../context/authTestWrapper";
import { OAuthCallbackScreen } from ".";

const CONFIRM_LINK_URL = "/api/auth/oauth/google/link/confirm";
const CURRENT_USER_URL = "/api/auth/me";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

let replace: ReturnType<typeof vi.fn>;

const mockCallbackParams = (params: Record<string, string>) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(params) as ReturnType<typeof useSearchParams>,
  );
};

beforeEach(() => {
  ({ replace } = mockNextRouter());
});

const renderScreen = () =>
  render(<OAuthCallbackScreen />, { wrapper: createAuthQueryClientWrapper() });

describe("OAuthCallbackScreen", () => {
  it("asks for a password to confirm linking, then signs in and redirects", async () => {
    mockCallbackParams({
      linkToken: "link-token-123",
      email: "ava@outfiqe.test",
      provider: "google",
    });
    mswServer.use(
      http.post(CONFIRM_LINK_URL, () =>
        HttpResponse.json({
          success: true,
          message: "Account connected. You're now signed in.",
          data: { accessToken: "access-token" },
        }),
      ),
      http.get(CURRENT_USER_URL, () =>
        HttpResponse.json({
          success: true,
          message: "Current user.",
          data: {
            id: "user-1",
            name: "Ava Martinez",
            email: "ava@outfiqe.test",
            phone: null,
            avatarUrl: null,
            role: "CUSTOMER",
            isCreator: false,
            creatorStatus: "NONE",
            hasPassword: true,
          },
        }),
      ),
    );
    const user = userEvent.setup();

    renderScreen();
    expect(screen.getByText(/ava@outfiqe.test already has an Outfiqe account/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Password"), "correct-horse-battery");
    await user.click(screen.getByRole("button", { name: "Connect Google" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("surfaces an incorrect password without redirecting", async () => {
    mockCallbackParams({
      linkToken: "link-token-123",
      email: "ava@outfiqe.test",
      provider: "google",
    });
    mswServer.use(
      http.post(CONFIRM_LINK_URL, () =>
        HttpResponse.json(
          { success: false, message: "Incorrect password.", code: "INVALID_CREDENTIALS" },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();

    renderScreen();
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Connect Google" }));

    expect(await screen.findByText("Incorrect email or password.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a generic failure message when the callback carries only an error code", () => {
    mockCallbackParams({ error: "OAUTH_STATE_INVALID" });

    renderScreen();

    expect(
      screen.getByText("This sign-in attempt has expired or was already used. Please try again."),
    ).toBeInTheDocument();
  });

  it("falls back to a generic message when nothing useful is in the query string", () => {
    mockCallbackParams({});

    renderScreen();

    expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
  });
});
