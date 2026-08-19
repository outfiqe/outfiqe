import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { RegisterInput } from "../schemas/register.schema";
import { useRegister } from "./useRegister";

const REGISTER_URL = "/api/auth/register";

const registerInput: RegisterInput = {
  name: "Ava Martinez",
  email: "ava@outfiqe.test",
  phone: "9812345678",
  password: "correct-horse-battery",
  confirmPassword: "correct-horse-battery",
};

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useRegister", () => {
  it("registers a new account and returns its id", async () => {
    mswServer.use(
      http.post(REGISTER_URL, async ({ request }) => {
        const body = await request.json();
        expect(body).toMatchObject({ email: registerInput.email });

        return HttpResponse.json(
          { success: true, message: "Account created.", data: { userId: "user-1" } },
          { status: 201 },
        );
      }),
    );

    const { result } = renderHook(() => useRegister(), { wrapper });
    result.current.mutate(registerInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ userId: "user-1" });
  });

  it("surfaces a duplicate-email error from the API", async () => {
    mswServer.use(
      http.post(REGISTER_URL, () =>
        HttpResponse.json(
          {
            success: false,
            message: "An account with this email already exists.",
            code: "USER_EXISTS",
          },
          { status: 409 },
        ),
      ),
    );

    const { result } = renderHook(() => useRegister(), { wrapper });
    result.current.mutate(registerInput);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe("USER_EXISTS");
  });
});
