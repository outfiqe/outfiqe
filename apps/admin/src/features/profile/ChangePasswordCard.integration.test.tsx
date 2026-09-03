import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { ChangePasswordCard } from "./ChangePasswordCard";

const CHANGE_PASSWORD_URL = "http://localhost:3000/api/auth/change-password";

const renderCard = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<ChangePasswordCard />, { wrapper });
};

const fillAndSubmit = async (
  user: ReturnType<typeof userEvent.setup>,
  values: { current: string; next: string; confirm: string },
) => {
  await user.type(screen.getByLabelText("Current password"), values.current);
  await user.type(screen.getByLabelText("New password"), values.next);
  await user.type(screen.getByLabelText("Confirm new password"), values.confirm);
  await user.click(screen.getByRole("button", { name: "Update password" }));
};

describe("admin ChangePasswordCard", () => {
  it("submits the change and confirms other devices were signed out", async () => {
    let requestBody: unknown;
    mswServer.use(
      http.post(CHANGE_PASSWORD_URL, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );
    const user = userEvent.setup();
    renderCard();

    await fillAndSubmit(user, {
      current: "old-secret-1",
      next: "new-secret-2",
      confirm: "new-secret-2",
    });

    await waitFor(() =>
      expect(requestBody).toEqual({
        currentPassword: "old-secret-1",
        newPassword: "new-secret-2",
        confirmNewPassword: "new-secret-2",
      }),
    );
    expect(await screen.findByText(/other devices were signed out/i)).toBeInTheDocument();
  });

  it("does not call the API when the confirmation does not match", async () => {
    let called = false;
    mswServer.use(
      http.post(CHANGE_PASSWORD_URL, () => {
        called = true;
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );
    const user = userEvent.setup();
    renderCard();

    await fillAndSubmit(user, { current: "old-secret-1", next: "new-secret-2", confirm: "nope-3" });

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("surfaces the API message when the current password is wrong", async () => {
    mswServer.use(
      http.post(CHANGE_PASSWORD_URL, () =>
        HttpResponse.json(
          {
            success: false,
            message: "Your current password is incorrect.",
            code: "INVALID_CURRENT_PASSWORD",
          },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCard();

    await fillAndSubmit(user, { current: "wrong", next: "new-secret-2", confirm: "new-secret-2" });

    expect(await screen.findByText("Your current password is incorrect.")).toBeInTheDocument();
  });
});
