import { mswServer } from "@test/integration/msw/server";
import { grantEveryPlatformPermission } from "@test/platformPermissionsMock";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildHub,
  emptyPage,
  HUBS_URL,
  LOGISTICS_API_BASE,
  okJson,
} from "../../testing/logisticsFixtures";
import { BagTagSheetPage } from "./BagTagSheetPage";
import { BagTagsPage } from "./BagTagsPage";

const BATCHES_URL = `${LOGISTICS_API_BASE}/bag-tag-batches`;

const batchSheet = {
  id: "batch-1",
  hubId: "hub-1",
  hubName: "Kathmandu Hub",
  tagCount: 3,
  usedTagCount: 1,
  createdAt: "2026-10-16T04:00:00.000Z",
  tags: [
    { code: "ABCDEFGHJK", isUsed: false },
    { code: "BCDEFGHJKM", isUsed: true },
    { code: "CDEFGHJKMN", isUsed: false },
  ],
};

afterEach(() => {
  grantEveryPlatformPermission();
});

describe("BagTagsPage", () => {
  it("makes a sticker batch for the selected hub", async () => {
    let createBody: unknown;
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(BATCHES_URL, () => okJson(emptyPage)),
      http.post(BATCHES_URL, async ({ request }) => {
        createBody = await request.json();
        return okJson(batchSheet, 201);
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<BagTagsPage />, { path: "/logistics/bag-tags" });

    expect(await screen.findByText("No sticker batches for this hub yet.")).toBeInTheDocument();
    const tagCountInput = screen.getByLabelText("How many stickers");
    await user.clear(tagCountInput);
    await user.type(tagCountInput, "25");
    await user.click(screen.getByRole("button", { name: "Make stickers" }));

    await waitFor(() => expect(createBody).toEqual({ hubId: "hub-1", tagCount: 25 }));
  });

  it("lists earlier batches with how many stickers are used", async () => {
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [buildHub()] })),
      http.get(BATCHES_URL, () => okJson({ items: [batchSheet], nextCursor: null })),
    );
    renderWithRouter(<BagTagsPage />, { path: "/logistics/bag-tags" });

    expect(await screen.findByText(/3 stickers · 1 used/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open sheet" })).toBeInTheDocument();
  });
});

describe("BagTagSheetPage", () => {
  it("prints only the stickers nobody has used yet", async () => {
    mswServer.use(http.get(`${BATCHES_URL}/batch-1`, () => okJson(batchSheet)));
    renderWithRouter(<BagTagSheetPage batchId="batch-1" />, {
      path: "/logistics/bag-tags/batch-1",
    });

    expect(await screen.findByRole("img", { name: "Bag sticker ABCDEFGHJK" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Bag sticker CDEFGHJKMN" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Bag sticker BCDEFGHJKM" })).not.toBeInTheDocument();
    expect(screen.getByText(/2 of 3 not used yet/)).toBeInTheDocument();
  });
});
