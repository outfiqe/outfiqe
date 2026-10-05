import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { PlatformSwitchesPage } from "./PlatformSwitchesPage";

const FLAGS_URL = "http://localhost:3000/api/platform/feature-flags";
const SERVER_ERROR_STATUS = 500;
const PERSON_ID = "11111111-1111-4111-8111-111111111111";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const outfitBuilderSwitch = {
  key: "outfit_builder",
  label: "Outfit Build",
  description: "Collaborative outfit boards.",
  rollout: "OFF",
  allowedUserIds: [],
  allowedBrandIds: [],
  updatedAt: null,
};

const renderPage = () =>
  renderWithRouter(
    <>
      <PlatformSwitchesPage />
      <Toaster />
    </>,
    { path: "/platform/switches" },
  );

describe("PlatformSwitchesPage", () => {
  it("turns a switch on for a list of people and saves it", async () => {
    let savedBody: unknown;
    mswServer.use(
      http.get(FLAGS_URL, () => okJson([outfitBuilderSwitch])),
      http.put(`${FLAGS_URL}/outfit_builder`, async ({ request }) => {
        savedBody = await request.json();
        return okJson(null);
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Who has it" }),
      "ALLOW_LIST",
    );
    await user.type(screen.getByLabelText("Person IDs (one per line)"), PERSON_ID);
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(savedBody).toEqual({
        rollout: "ALLOW_LIST",
        allowedUserIds: [PERSON_ID],
        allowedBrandIds: [],
      }),
    );
    expect(await screen.findByText("Outfit Build saved.")).toBeInTheDocument();
  });

  it("refuses an allow-list entry that isn't an ID before sending anything", async () => {
    let wasSaved = false;
    mswServer.use(
      http.get(FLAGS_URL, () => okJson([{ ...outfitBuilderSwitch, rollout: "ALLOW_LIST" }])),
      http.put(`${FLAGS_URL}/outfit_builder`, () => {
        wasSaved = true;
        return okJson(null);
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Brand IDs (one per line)"), "kastha");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText('"kastha" isn\'t a valid ID.')).toBeInTheDocument();
    expect(wasSaved).toBe(false);
  });

  it("shows the empty and error states", async () => {
    mswServer.use(http.get(FLAGS_URL, () => okJson([])));
    const { unmount } = renderPage();
    expect(await screen.findByText("There are no feature switches yet.")).toBeInTheDocument();
    unmount();

    mswServer.use(
      http.get(FLAGS_URL, () =>
        HttpResponse.json({ success: false, message: "Boom" }, { status: SERVER_ERROR_STATUS }),
      ),
    );
    renderPage();
    expect(await screen.findByText("Boom")).toBeInTheDocument();
  });
});
