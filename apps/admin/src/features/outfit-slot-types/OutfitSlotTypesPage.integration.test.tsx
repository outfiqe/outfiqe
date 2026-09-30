import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { OutfitSlotTypesPage } from "./OutfitSlotTypesPage";
import type { OutfitSlotType } from "./schemas";

const API_BASE = "http://localhost:3000/api";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const slotType = (
  id: string,
  label: string,
  overrides: Partial<OutfitSlotType> = {},
): OutfitSlotType => ({
  id,
  key: label.toLowerCase().replace(/\s+/g, "-"),
  label,
  icon: "shirt",
  maxItems: 1,
  acceptsAnyProductType: false,
  sortOrder: 0,
  isActive: true,
  productTypes: [{ id: "type-tops", slug: "tops", label: "Tops" }],
  blocksSlotTypes: [],
  blockedBySlotTypes: [],
  ...overrides,
});

const garmentTypes = [
  { id: "type-tops", slug: "tops", label: "Tops" },
  { id: "type-footwear", slug: "footwear", label: "Footwear" },
].map((garmentType, sortOrder) => ({
  ...garmentType,
  sortOrder,
  isActive: true,
  productCount: 0,
  sizeOptionCount: 1,
}));

const serveSlotTypes = (slotTypes: OutfitSlotType[]) =>
  mswServer.use(
    http.get(`${API_BASE}/outfit-slot-types/admin`, () => okJson(slotTypes)),
    http.get(`${API_BASE}/product-types/admin`, () => okJson(garmentTypes)),
  );

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <OutfitSlotTypesPage />
      <Toaster />
    </QueryClientProvider>,
  );
};

describe("OutfitSlotTypesPage", () => {
  it("describes each slot: what fills it, how many it holds, and what it blocks", async () => {
    serveSlotTypes([
      slotType("slot-full", "Full Outfit", {
        blocksSlotTypes: [{ id: "slot-top", key: "top", label: "Top" }],
      }),
      slotType("slot-extra", "Extra", {
        maxItems: 3,
        acceptsAnyProductType: true,
        productTypes: [],
      }),
    ]);

    renderPage();

    expect(await screen.findByText(/Holds 1 item · Tops/)).toBeInTheDocument();
    expect(screen.getByText(/Holds up to 3 items · Any garment type/)).toBeInTheDocument();
    expect(screen.getByText("Can't be filled at the same time as Top")).toBeInTheDocument();
  });

  it("shows an empty state that explains why a slot is needed", async () => {
    serveSlotTypes([]);

    renderPage();

    expect(await screen.findByText(/No slot types yet/)).toBeInTheDocument();
  });

  it("says so when the list can't load", async () => {
    mswServer.use(
      http.get(`${API_BASE}/outfit-slot-types/admin`, () =>
        HttpResponse.json({ success: false, message: "Server unavailable." }, { status: 500 }),
      ),
    );

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load slot types.");
  });

  it("creates a slot type from the form, filling the key from the name", async () => {
    let createBody: unknown;
    serveSlotTypes([]);
    mswServer.use(
      http.post(`${API_BASE}/outfit-slot-types`, async ({ request }) => {
        createBody = await request.json();
        return okJson(slotType("slot-new", "Party Shoes"));
      }),
    );

    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "New slot type" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Party Shoes");
    expect(within(dialog).getByLabelText("Key")).toHaveValue("party-shoes");
    await user.selectOptions(within(dialog).getByLabelText("Icon"), "footwear");
    await user.selectOptions(
      within(dialog).getByLabelText("Garment types that fill this slot"),
      "type-footwear",
    );
    await user.click(within(dialog).getByRole("button", { name: "Create slot type" }));

    await waitFor(() =>
      expect(createBody).toEqual({
        key: "party-shoes",
        label: "Party Shoes",
        icon: "footwear",
        maxItems: 1,
        acceptsAnyProductType: false,
        productTypeIds: ["type-footwear"],
        blocksSlotTypeIds: [],
      }),
    );
    expect(await screen.findByText("Slot type created.")).toBeInTheDocument();
  });

  it("explains a missing garment type inline and sends nothing", async () => {
    const createRequested = vi.fn();
    serveSlotTypes([]);
    mswServer.use(
      http.post(`${API_BASE}/outfit-slot-types`, () => {
        createRequested();
        return okJson(slotType("slot-new", "Belt"));
      }),
    );

    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "New slot type" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Belt");
    await user.click(within(dialog).getByRole("button", { name: "Create slot type" }));

    expect(
      await within(dialog).findByText(
        "Pick at least one garment type, or let this slot take any garment type.",
      ),
    ).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("sends no garment types for a slot that takes any garment type", async () => {
    let createBody: unknown;
    serveSlotTypes([]);
    mswServer.use(
      http.post(`${API_BASE}/outfit-slot-types`, async ({ request }) => {
        createBody = await request.json();
        return okJson(slotType("slot-new", "Bonus"));
      }),
    );

    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "New slot type" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Bonus");
    await user.click(within(dialog).getByLabelText("Takes any garment type"));
    await user.click(within(dialog).getByRole("button", { name: "Create slot type" }));

    await waitFor(() =>
      expect(createBody).toMatchObject({ acceptsAnyProductType: true, productTypeIds: [] }),
    );
  });

  it("edits a slot type without letting the key change, and shows a server error", async () => {
    let patchBody: unknown;
    serveSlotTypes([
      slotType("slot-top", "Top"),
      slotType("slot-full", "Full Outfit", { icon: "dress" }),
    ]);
    mswServer.use(
      http.patch(`${API_BASE}/outfit-slot-types/slot-full`, async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json(
          { success: false, message: "One or more of the slot types to block no longer exist." },
          { status: 422 },
        );
      }),
    );

    renderPage();
    const user = userEvent.setup();

    const fullOutfitRow = (await screen.findByRole("heading", { name: "Full Outfit" })).closest(
      "div.rounded-xl",
    ) as HTMLElement;
    await user.click(within(fullOutfitRow).getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Key")).toBeDisabled();
    await user.selectOptions(
      within(dialog).getByLabelText("Can't be filled at the same time as"),
      "slot-top",
    );
    await user.click(within(dialog).getByRole("button", { name: "Save slot type" }));

    await waitFor(() => expect(patchBody).toMatchObject({ blocksSlotTypeIds: ["slot-top"] }));
    expect(patchBody).not.toHaveProperty("key");
    expect(
      await within(dialog).findByText("One or more of the slot types to block no longer exist."),
    ).toBeInTheDocument();
  });

  it("switches a slot type off", async () => {
    let patchBody: unknown;
    serveSlotTypes([slotType("slot-top", "Top")]);
    mswServer.use(
      http.patch(`${API_BASE}/outfit-slot-types/slot-top`, async ({ request }) => {
        patchBody = await request.json();
        return okJson(slotType("slot-top", "Top", { isActive: false }));
      }),
    );

    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Switch off" }));

    await waitFor(() => expect(patchBody).toEqual({ isActive: false }));
    expect(await screen.findByText("Slot type switched off.")).toBeInTheDocument();
  });

  it("reorders by drag and by the arrow buttons, and rolls back when saving fails", async () => {
    const reorderBodies: unknown[] = [];
    serveSlotTypes([
      slotType("slot-a", "Alpha"),
      slotType("slot-b", "Beta"),
      slotType("slot-c", "Gamma"),
    ]);
    mswServer.use(
      http.post(`${API_BASE}/outfit-slot-types/reorder`, async ({ request }) => {
        reorderBodies.push(await request.json());
        return HttpResponse.json({ success: false, message: "nope" }, { status: 500 });
      }),
    );

    renderPage();
    const user = userEvent.setup();

    const cardFor = async (name: string) =>
      (await screen.findByRole("heading", { name })).closest('[draggable="true"]') as HTMLElement;
    fireEvent.dragStart(await cardFor("Gamma"));
    fireEvent.dragEnter(await cardFor("Alpha"));
    fireEvent.drop(await cardFor("Alpha"));
    await waitFor(() =>
      expect(reorderBodies[0]).toEqual({ orderedIds: ["slot-c", "slot-a", "slot-b"] }),
    );

    await waitFor(() => {
      const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
      expect(headings).toEqual(["Alpha", "Beta", "Gamma"]);
    });

    await user.click(screen.getByRole("button", { name: "Move Beta up" }));
    await waitFor(() =>
      expect(reorderBodies[1]).toEqual({ orderedIds: ["slot-b", "slot-a", "slot-c"] }),
    );
  });
});
