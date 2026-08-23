import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { useAuth } from "../context/AuthContext";
import { createAuthQueryClientWrapper, dispatchAuthSuccess } from "../context/authTestWrapper";
import { useAddPhoneNumber } from "./useAddPhoneNumber";

const UPDATE_ME_URL = "/api/users/me";

const renderUseAddPhoneNumber = () => {
  const rendered = renderHook(() => ({ addPhoneNumber: useAddPhoneNumber(), auth: useAuth() }), {
    wrapper: createAuthQueryClientWrapper(),
  });

  dispatchAuthSuccess(rendered.result.current.auth.dispatch);

  return rendered;
};

describe("useAddPhoneNumber", () => {
  it("updates the profile and reflects the new phone on the auth user", async () => {
    mswServer.use(
      http.patch(UPDATE_ME_URL, () =>
        HttpResponse.json({ success: true, message: "Profile updated.", data: {} }),
      ),
    );

    const { result } = renderUseAddPhoneNumber();
    expect(result.current.auth.state.user?.phone).toBeUndefined();

    result.current.addPhoneNumber.mutate({ phone: "9812345678" });

    await waitFor(() => expect(result.current.addPhoneNumber.isSuccess).toBe(true));
    expect(result.current.auth.state.user?.phone).toBe("9812345678");
  });

  it("surfaces a phone conflict from the backend", async () => {
    mswServer.use(
      http.patch(
        UPDATE_ME_URL,
        () =>
          HttpResponse.json(
            {
              success: false,
              message: "An account with this phone number already exists.",
              code: "PHONE_EXISTS",
            },
            { status: 409 },
          ),
        { once: true },
      ),
    );

    const { result } = renderUseAddPhoneNumber();

    result.current.addPhoneNumber.mutate({ phone: "9812345678" });

    await waitFor(() => expect(result.current.addPhoneNumber.isError).toBe(true));
    expect(result.current.addPhoneNumber.error?.code).toBe("PHONE_EXISTS");
  });
});
