import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ChangePasswordCard } from ".";

const CHANGE_PASSWORD_URL = "/api/auth/change-password";

const renderCard = (hasPassword: boolean) =>
  render(<ChangePasswordCard hasPassword={hasPassword} />, { wrapper: createQueryClientWrapper() });

const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  values: { current: string; next: string; confirm: string },
) => {
  await user.type(screen.getByLabelText("Current password"), values.current);
  await user.type(screen.getByLabelText("New password"), values.next);
  await user.type(screen.getByLabelText("Confirm new password"), values.confirm);
  await user.click(screen.getByRole("button", { name: "Update password" }));
};

describe("ChangePasswordCard", () => {
  it("points a connected-account user at the set-a-password flow instead of a form", () => {
    renderCard(false);

    expect(screen.getByRole("link", { name: "Set a password" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
  });

  it("submits the change and confirms other devices were signed out", async () => {
    let requestBody: unknown;
    mswServer.use(
      http.post(CHANGE_PASSWORD_URL, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({
          success: true,
          message: "Password updated. Other devices have been signed out.",
          data: null,
        });
      }),
    );
    const user = userEvent.setup();
    renderCard(true);

    await fillForm(user, {
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
    expect(await screen.findByText(/other devices have been signed out/i)).toBeInTheDocument();
  });

  it("flags an incorrect current password on the field", async () => {
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
    renderCard(true);

    await fillForm(user, { current: "wrong-one", next: "new-secret-2", confirm: "new-secret-2" });

    expect(await screen.findByText("Your current password is incorrect.")).toBeInTheDocument();
  });

  it("flags a breached new password on the new-password field", async () => {
    mswServer.use(
      http.post(CHANGE_PASSWORD_URL, () =>
        HttpResponse.json(
          {
            success: false,
            message: "This password has appeared in a data breach. Please choose another.",
            code: "PASSWORD_BREACHED",
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCard(true);

    await fillForm(user, {
      current: "old-secret-1",
      next: "hunter2-common",
      confirm: "hunter2-common",
    });

    expect(
      await screen.findByText(
        "This password has appeared in a data breach. Please choose another.",
      ),
    ).toBeInTheDocument();
  });

  it("shows an error banner for an unexpected failure", async () => {
    mswServer.use(
      http.post(CHANGE_PASSWORD_URL, () =>
        HttpResponse.json(
          { success: false, message: "Server exploded.", code: "INTERNAL_ERROR" },
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCard(true);

    await fillForm(user, {
      current: "old-secret-1",
      next: "new-secret-2",
      confirm: "new-secret-2",
    });

    expect(await screen.findByText(/went wrong/i)).toBeInTheDocument();
  });

  it("blocks submitting when the confirmation does not match", async () => {
    let called = false;
    mswServer.use(
      http.post(CHANGE_PASSWORD_URL, () => {
        called = true;
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );
    const user = userEvent.setup();
    renderCard(true);

    await fillForm(user, { current: "old-secret-1", next: "new-secret-2", confirm: "different-3" });

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(called).toBe(false);
  });
});
