import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "../../context/AuthContext";
import { createAuthQueryClientWrapper } from "../../context/authTestWrapper";
import type { RiderRegisterInput } from "../schemas/riderRegister.schema";
import { useRiderRegister } from "./useRiderRegister";

const REGISTER_RIDER_URL = "/api/auth/register/rider";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

let replace: ReturnType<typeof vi.fn>;

beforeEach(() => {
  ({ replace } = mockNextRouter());
});

const riderRegisterInput: RiderRegisterInput = {
  inviteToken: "invite-token",
  phone: "9812345678",
  password: "correct-horse-battery",
  confirmPassword: "correct-horse-battery",
};

const riderUser = {
  id: "rider-user-1",
  name: "Asha Rider",
  handle: "asha-rider",
  email: "asha@outfiqe.test",
  phone: "9812345678",
  avatarUrl: null,
  role: "RIDER",
  isCreator: false,
  creatorStatus: "NONE",
  hasPassword: true,
};

const renderUseRiderRegister = () =>
  renderHook(() => ({ riderRegister: useRiderRegister(), auth: useAuth() }), {
    wrapper: createAuthQueryClientWrapper(),
  });

describe("useRiderRegister", () => {
  it("creates the rider login, signs them in and opens their visits", async () => {
    mswServer.use(
      http.post(REGISTER_RIDER_URL, () =>
        HttpResponse.json(
          {
            success: true,
            message: "Rider account created.",
            data: { accessToken: "access-token", user: riderUser },
          },
          { status: 201 },
        ),
      ),
    );

    const { result } = renderUseRiderRegister();
    result.current.riderRegister.mutate(riderRegisterInput);

    await waitFor(() => expect(result.current.riderRegister.isSuccess).toBe(true));
    expect(result.current.auth.isRider).toBe(true);
    expect(replace).toHaveBeenCalledWith("/rider");
  });

  it("keeps the rider signed out when the invite was already used", async () => {
    mswServer.use(
      http.post(REGISTER_RIDER_URL, () =>
        HttpResponse.json(
          {
            success: false,
            message: "This invite link has already been used.",
            code: "INVITE_USED",
          },
          { status: 400 },
        ),
      ),
    );

    const { result } = renderUseRiderRegister();
    result.current.riderRegister.mutate(riderRegisterInput);

    await waitFor(() => expect(result.current.riderRegister.isError).toBe(true));
    expect(result.current.riderRegister.error?.code).toBe("INVITE_USED");
    expect(result.current.auth.isAuthenticated).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });
});
