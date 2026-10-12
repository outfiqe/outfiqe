import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { PlatformSettingsPage } from "./PlatformSettingsPage";

const SETTINGS_URL = "http://localhost:3000/api/platform/settings";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const setting = (overrides: Record<string, unknown> = {}) => ({
  key: "outfit.maxItemsPerBoard",
  label: "Items per board",
  description: "The most products one build can hold.",
  group: "Outfit Build",
  defaultValue: 7,
  minimum: 1,
  maximum: 30,
  value: 7,
  isOverridden: false,
  updatedAt: null,
  ...overrides,
});

const renderPage = () =>
  renderWithRouter(
    <>
      <PlatformSettingsPage />
      <Toaster />
    </>,
    { path: "/platform/settings" },
  );

describe("PlatformSettingsPage", () => {
  it("groups settings and saves a new value", async () => {
    let savedBody: unknown;
    mswServer.use(
      http.get(SETTINGS_URL, () =>
        okJson([
          setting(),
          setting({ key: "chat.maxGroupMembers", label: "Group size", group: "Chat" }),
        ]),
      ),
      http.put(`${SETTINGS_URL}/outfit.maxItemsPerBoard`, async ({ request }) => {
        savedBody = await request.json();
        return okJson(null);
      }),
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("heading", { name: "Outfit Build" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chat" })).toBeInTheDocument();
    const itemsField = screen.getByLabelText("Items per board");
    await user.clear(itemsField);
    await user.type(itemsField, "9");
    const [itemsSaveButton] = screen.getAllByRole("button", { name: "Save" });
    if (!itemsSaveButton) throw new Error("Expected a Save button for the first setting");
    await user.click(itemsSaveButton);

    await waitFor(() => expect(savedBody).toEqual({ value: 9 }));
  });

  it("refuses a value outside the allowed range", async () => {
    mswServer.use(http.get(SETTINGS_URL, () => okJson([setting()])));
    const user = userEvent.setup();
    renderPage();

    const itemsField = await screen.findByLabelText("Items per board");
    await user.clear(itemsField);
    await user.type(itemsField, "99");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Enter a whole number from 1 to 30.")).toBeInTheDocument();
  });

  it("resets a changed setting to its default", async () => {
    let wasReset = false;
    mswServer.use(
      http.get(SETTINGS_URL, () => okJson([setting({ value: 12, isOverridden: true })])),
      http.delete(`${SETTINGS_URL}/outfit.maxItemsPerBoard`, () => {
        wasReset = true;
        return okJson(null);
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reset" }));

    await waitFor(() => expect(wasReset).toBe(true));
  });

  it("says so when there are no settings", async () => {
    mswServer.use(http.get(SETTINGS_URL, () => okJson([])));
    renderPage();

    expect(await screen.findByText("There are no settings yet.")).toBeInTheDocument();
  });
});
