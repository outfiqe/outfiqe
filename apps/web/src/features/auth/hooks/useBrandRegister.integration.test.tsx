import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "../context/AuthContext";
import { createAuthQueryClientWrapper } from "../context/authTestWrapper";
import type { BrandRegisterInput } from "../schemas/brandRegister.schema";
import { useBrandRegister } from "./useBrandRegister";

const REGISTER_BRAND_URL = "/api/auth/register/brand";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

let replace: ReturnType<typeof vi.fn>;

beforeEach(() => {
  ({ replace } = mockNextRouter());
});

const brandRegisterInput: BrandRegisterInput = {
  inviteToken: "invite-token",
  name: "Jordan Lee",
  phone: "9812345678",
  password: "correct-horse-battery",
  confirmPassword: "correct-horse-battery",
};

const brandUser = {
  id: "user-1",
  name: "Jordan Lee",
  email: "jordan@outfiqe.test",
  phone: "9812345678",
  avatarUrl: null,
  role: "BRAND_OWNER",
  brandId: "brand-1",
};

const renderUseBrandRegister = () =>
  renderHook(() => ({ brandRegister: useBrandRegister(), auth: useAuth() }), {
    wrapper: createAuthQueryClientWrapper(),
  });

describe("useBrandRegister", () => {
  it("registers the brand owner, updates auth state, and redirects to the dashboard", async () => {
    mswServer.use(
      http.post(REGISTER_BRAND_URL, async ({ request }) => {
        const body = await request.json();
        expect(body).toMatchObject({ inviteToken: brandRegisterInput.inviteToken });

        return HttpResponse.json(
          {
            success: true,
            message: "Brand account created.",
            data: { accessToken: "access-token", user: brandUser },
          },
          { status: 201 },
        );
      }),
    );

    const { result } = renderUseBrandRegister();
    result.current.brandRegister.mutate(brandRegisterInput);

    await waitFor(() => expect(result.current.brandRegister.isSuccess).toBe(true));
    expect(result.current.auth.isAuthenticated).toBe(true);
    expect(result.current.auth.state.user).toMatchObject({ id: brandUser.id });
    expect(replace).toHaveBeenCalledWith("/profile");
  });

  it("surfaces an invalid-invite error without updating auth state", async () => {
    mswServer.use(
      http.post(REGISTER_BRAND_URL, () =>
        HttpResponse.json(
          {
            success: false,
            message: "This invite link is not valid or has already been used.",
            code: "INVALID_INVITE",
          },
          { status: 400 },
        ),
      ),
    );

    const { result } = renderUseBrandRegister();
    result.current.brandRegister.mutate(brandRegisterInput);

    await waitFor(() => expect(result.current.brandRegister.isError).toBe(true));
    expect(result.current.brandRegister.error?.code).toBe("INVALID_INVITE");
    expect(result.current.auth.isAuthenticated).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });
});
