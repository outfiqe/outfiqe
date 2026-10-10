import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { PlatformSwitchesPage } from "./PlatformSwitchesPage";

const API_BASE = "http://localhost:3000/api";
const FLAGS_URL = `${API_BASE}/platform/feature-flags`;
const SERVER_ERROR_STATUS = 500;
const ASHA = { id: "11111111-1111-4111-8111-111111111111", name: "Asha Rai", handle: "asha" };
const HARI = { id: "22222222-2222-4222-8222-222222222222", name: "Hari Thapa", handle: "hari" };
const KASTHA = { id: "33333333-3333-4333-8333-333333333333", name: "Kastha" };

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const outfitBuilderSwitch = {
  key: "outfit_builder",
  label: "Outfit Build",
  description: "Collaborative outfit boards.",
  rollout: "OFF",
  allowedUserIds: [],
  allowedBrandIds: [],
  allowedUsers: [],
  allowedBrands: [],
  updatedAt: null,
};

const stubSearches = () =>
  mswServer.use(
    http.get(`${API_BASE}/users/search`, () => okJson([{ ...ASHA, avatarUrl: null }])),
    http.get(`${API_BASE}/brands`, () => okJson({ brands: [{ ...KASTHA, avatarUrl: null }] })),
  );

const renderPage = () =>
  renderWithRouter(
    <>
      <PlatformSwitchesPage />
      <Toaster />
    </>,
    { path: "/platform/switches" },
  );

describe("PlatformSwitchesPage", () => {
  it("adds a person and a brand by searching for them, and saves their ids", async () => {
    let savedBody: unknown;
    stubSearches();
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
    expect(screen.getByText("No people added yet.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Add a person"), "asha");
    await user.click(await screen.findByText("Asha Rai"));
    await user.type(screen.getByLabelText(/Add a brand/), "kas");
    await user.click(await screen.findByText("Kastha"));

    const people = screen.getByRole("list", { name: "People who have Outfit Build" });
    expect(within(people).getByText("@asha")).toBeInTheDocument();
    const brands = screen.getByRole("list", { name: "Brands that have Outfit Build" });
    expect(within(brands).getByText("Kastha")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(savedBody).toEqual({
        rollout: "ALLOW_LIST",
        allowedUserIds: [ASHA.id],
        allowedBrandIds: [KASTHA.id],
      }),
    );
    expect(await screen.findByText("Outfit Build saved.")).toBeInTheDocument();
  });

  it("shows who is already on the list by name and saves without the one removed", async () => {
    let savedBody: unknown;
    mswServer.use(
      http.get(FLAGS_URL, () =>
        okJson([
          {
            ...outfitBuilderSwitch,
            rollout: "ALLOW_LIST",
            allowedUserIds: [ASHA.id, HARI.id],
            allowedUsers: [ASHA, HARI],
          },
        ]),
      ),
      http.put(`${FLAGS_URL}/outfit_builder`, async ({ request }) => {
        savedBody = await request.json();
        return okJson(null);
      }),
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Hari Thapa")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Asha Rai" }));
    expect(screen.queryByText("Asha Rai")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(savedBody).toEqual({
        rollout: "ALLOW_LIST",
        allowedUserIds: [HARI.id],
        allowedBrandIds: [],
      }),
    );
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
