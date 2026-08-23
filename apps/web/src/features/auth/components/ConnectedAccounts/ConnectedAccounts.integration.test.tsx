import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ConnectedAccounts } from ".";

const LINKED_ACCOUNTS_URL = "/api/auth/oauth/linked";

const mockLinkedAccounts = (
  accounts: { provider: string; emailAtLinkTime: string; connectedAt: string }[],
) => {
  mswServer.use(
    http.get(LINKED_ACCOUNTS_URL, () =>
      HttpResponse.json({ success: true, message: "Linked accounts.", data: { accounts } }),
    ),
  );
};

const renderConnectedAccounts = (hasPassword: boolean) =>
  render(<ConnectedAccounts hasPassword={hasPassword} />, { wrapper: createQueryClientWrapper() });

describe("ConnectedAccounts", () => {
  it("shows both providers as not connected when nothing is linked", async () => {
    mockLinkedAccounts([]);

    renderConnectedAccounts(true);

    expect(await screen.findAllByText("Not connected")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Connect" })).toHaveLength(2);
  });

  it("shows a connected provider with its linked email and a disconnect action", async () => {
    mockLinkedAccounts([
      { provider: "google", emailAtLinkTime: "ava@gmail.com", connectedAt: "2026-08-01T00:00:00Z" },
    ]);

    renderConnectedAccounts(true);

    expect(await screen.findByText("Connected as ava@gmail.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect" })).toBeInTheDocument();
  });

  it("blocks disconnecting a password-less account's sole connected provider", async () => {
    mockLinkedAccounts([
      { provider: "google", emailAtLinkTime: "ava@gmail.com", connectedAt: "2026-08-01T00:00:00Z" },
    ]);
    const user = userEvent.setup();

    renderConnectedAccounts(false);
    await screen.findByText("Connected as ava@gmail.com");
    await user.click(screen.getByRole("button", { name: "Disconnect" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/is currently your only way to sign in/)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("asks for a password before disconnecting when the account has one", async () => {
    mockLinkedAccounts([
      { provider: "google", emailAtLinkTime: "ava@gmail.com", connectedAt: "2026-08-01T00:00:00Z" },
    ]);
    mswServer.use(
      http.delete("/api/auth/oauth/google/link", () =>
        HttpResponse.json({ success: true, message: "Account disconnected.", data: null }),
      ),
    );
    const user = userEvent.setup();

    renderConnectedAccounts(true);
    await screen.findByText("Connected as ava@gmail.com");
    await user.click(screen.getByRole("button", { name: "Disconnect" }));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Password"), "correct-horse-battery");
    await user.click(within(dialog).getByRole("button", { name: "Disconnect" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
