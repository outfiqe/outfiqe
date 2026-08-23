import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { createAuthQueryClientWrapper } from "../context/authTestWrapper";
import { AddPhoneNumberBanner } from "./AddPhoneNumberBanner";

const UPDATE_ME_URL = "/api/users/me";

const renderBanner = () =>
  render(<AddPhoneNumberBanner />, { wrapper: createAuthQueryClientWrapper() });

describe("AddPhoneNumberBanner", () => {
  it("shows the nudge and opens the phone form on click", async () => {
    const user = userEvent.setup();
    renderBanner();

    expect(screen.getByText("Add a phone number")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add phone number" }));

    expect(screen.getByPlaceholderText("98XXXXXXXX")).toBeInTheDocument();
  });

  it("validates the phone number before submitting", async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole("button", { name: "Add phone number" }));
    await user.type(screen.getByPlaceholderText("98XXXXXXXX"), "123");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/valid Nepali phone number/)).toBeInTheDocument();
  });

  it("saves a valid phone number and hides the nudge on success", async () => {
    mswServer.use(
      http.patch(UPDATE_ME_URL, () =>
        HttpResponse.json({ success: true, message: "Profile updated.", data: {} }),
      ),
    );
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole("button", { name: "Add phone number" }));
    await user.type(screen.getByPlaceholderText("98XXXXXXXX"), "9812345678");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByText("Add a phone number")).not.toBeInTheDocument());
  });
});
