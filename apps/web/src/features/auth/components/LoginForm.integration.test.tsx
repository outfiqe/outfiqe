import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthQueryClientWrapper } from "../context/authTestWrapper";
import { LoginForm } from "./LoginForm";

const LOGIN_URL = "/api/auth/login";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

const customerUser = {
  id: "user-1",
  name: "Ava Martinez",
  email: "ava@outfiqe.test",
  phone: "9812345678",
  avatarUrl: null,
  role: "CUSTOMER",
  isCreator: false,
  creatorStatus: "NONE",
  hasPassword: true,
};

beforeEach(() => {
  mockNextRouter();
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams() as ReturnType<typeof useSearchParams>,
  );
});

const fillAndSubmit = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email address"), "ava@outfiqe.test");
  await user.type(screen.getByLabelText("Password"), "correct-horse-battery");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
};

describe("LoginForm", () => {
  it("sends a Google sign-in with no requested page to the overview by default", () => {
    const Wrapper = createAuthQueryClientWrapper();

    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>,
    );

    expect(screen.getByRole("link", { name: /google/i })).toHaveAttribute(
      "href",
      "/api/auth/oauth/google/start?redirect=%2Foverview",
    );
  });

  it("keeps the sign-in button disabled after a successful login while the redirect is under way", async () => {
    mswServer.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json({
          success: true,
          message: "Login successful",
          data: { accessToken: "access-token", user: customerUser },
        }),
      ),
    );
    const Wrapper = createAuthQueryClientWrapper();

    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>,
    );
    await fillAndSubmit();

    const loadingButton = await screen.findByRole("button", { name: "Loading" });
    expect(loadingButton).toBeDisabled();

    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(screen.getByRole("button", { name: "Loading" })).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("re-enables the sign-in button when the credentials are rejected", async () => {
    mswServer.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json(
          { success: false, message: "Invalid email or password", code: "INVALID_CREDENTIALS" },
          { status: 401 },
        ),
      ),
    );
    const Wrapper = createAuthQueryClientWrapper();

    render(
      <Wrapper>
        <LoginForm />
      </Wrapper>,
    );
    await fillAndSubmit();

    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled());
  });
});
