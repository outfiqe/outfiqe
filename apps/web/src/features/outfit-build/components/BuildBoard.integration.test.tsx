import { Toaster } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import type { OutfitBoard, OutfitView } from "../api/outfitSchemas";
import { outfitQueryKey } from "../hooks/outfitQueryKeys";
import {
  buildBoard,
  buildSlot,
  outfitProduct,
  PRODUCT_TYPES,
  publicProduct,
  RAM,
  SITA,
} from "../testing/outfitFixtures";
import { BuildBoard } from "./BuildBoard";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const ok = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const KURTA = publicProduct("product-kurta", "tops", "Maroon Kurta");
const JUTTIS = publicProduct("product-juttis", "footwear", "Golden Juttis");

const CachedBoard = ({ outfitId }: { outfitId: string }) => {
  const { data: cachedView } = useQuery<OutfitView>({
    queryKey: outfitQueryKey(outfitId),
    queryFn: () => Promise.reject(new Error("The test seeds the board into the cache")),
    staleTime: Infinity,
  });
  if (cachedView?.kind !== "board") return null;
  return <BuildBoard board={cachedView} isReconnecting={false} />;
};

const renderBoard = (board: OutfitBoard) => {
  const { Wrapper, queryClient } = createTranslatedQueryWrapper();
  queryClient.setQueryData(outfitQueryKey(board.id), { ...board, kind: "board" });
  const view = render(
    <>
      <CachedBoard outfitId={board.id} />
      <Toaster />
    </>,
    { wrapper: Wrapper },
  );
  return { ...view, queryClient };
};

beforeEach(() => {
  window.history.replaceState(null, "", "/builds/outfit-1");
  vi.mocked(useAuth).mockReturnValue({
    state: { user: { id: SITA.id } },
  } as ReturnType<typeof useAuth>);
  mswServer.use(
    http.get("/api/product-types", () => ok(PRODUCT_TYPES)),
    http.get("/api/products", ({ request }) => {
      const type = new URL(request.url).searchParams.get("type");
      const products = type === "footwear" ? [JUTTIS] : [KURTA];
      return ok({ products, nextCursor: null, total: products.length, brandCount: 1 });
    }),
  );
});

describe("BuildBoard", () => {
  it("shows the slots and the lock hint first, and the people in their own tab", async () => {
    renderBoard(buildBoard());

    expect(screen.getByRole("heading", { name: "Dashain look" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Footwear" })).toBeInTheDocument();
    expect(screen.getByText("Add at least 2 items to lock.")).toBeInTheDocument();
    expect(screen.queryByText("Ram Thapa")).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("tab", { name: /People/ }));

    expect(screen.getByText("Sita Rai (you)")).toBeInTheDocument();
    expect(screen.getByText("Ram Thapa")).toBeInTheDocument();
    expect(window.location.search).toBe("?tab=people");
  });

  it("opens the tab named in the link", () => {
    window.history.replaceState(null, "", "/builds/outfit-1?tab=people");

    renderBoard(buildBoard());

    expect(screen.getByRole("tab", { name: /People/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Ram Thapa")).toBeInTheDocument();
  });

  it("adds a product picked for a slot, sending the version and a request key", async () => {
    const sentRequest: { headers: Headers | null } = { headers: null };
    const boardAfterAdd = buildBoard({
      version: 5,
      itemCount: 1,
      total: 3_200,
      slots: [
        buildSlot({
          items: [
            {
              position: 0,
              product: {
                id: KURTA.id,
                name: KURTA.name,
                imageUrl: null,
                price: 3_200,
                listPrice: 3_200,
                productTypeId: "type-tops",
                brand: { id: "brand-1", name: "Kathmandu Threads" },
                availability: "IN_STOCK",
                sizes: [],
              },
              addedBy: SITA,
              addedAt: "2026-09-30T10:05:00.000Z",
            },
          ],
        }),
      ],
    });
    mswServer.use(
      http.put("/api/outfits/outfit-1/slots/top/positions/0", ({ request }) => {
        sentRequest.headers = request.headers;
        return ok({ version: 5, board: boardAfterAdd });
      }),
    );
    renderBoard(buildBoard());
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add to Top" }));
    const picker = await screen.findByRole("dialog");
    await user.click(await within(picker).findByRole("button", { name: /Maroon Kurta/ }));

    await waitFor(() => expect(sentRequest.headers?.get("X-Outfit-Version")).toBe("4"));
    expect(sentRequest.headers?.get("Idempotency-Key")).toEqual(expect.any(String));
    expect(await screen.findByText("Total: Rs 3,200")).toBeInTheDocument();
  });

  it("undoes the change and names who got there first when the board moved on", async () => {
    mswServer.use(
      http.put("/api/outfits/outfit-1/slots/top/positions/0", () =>
        HttpResponse.json(
          {
            success: false,
            message: "Someone else changed this build.",
            code: "OUTFIT_VERSION_CONFLICT",
            details: { currentVersion: 5 },
          },
          { status: 409 },
        ),
      ),
      http.get("/api/outfits/outfit-1/events", () =>
        ok({
          events: [
            {
              version: 5,
              type: "ITEM_ADDED",
              actorId: RAM.id,
              payload: {},
              createdAt: "2026-09-30T10:04:00.000Z",
            },
          ],
          currentVersion: 5,
          hasMore: false,
        }),
      ),
      http.get("/api/outfits/outfit-1", () => ok({ ...buildBoard({ version: 5 }), kind: "board" })),
    );
    const { queryClient } = renderBoard(buildBoard());
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add to Top" }));
    await user.click(
      await within(await screen.findByRole("dialog")).findByRole("button", {
        name: /Maroon Kurta/,
      }),
    );

    expect(
      await screen.findByText("Board updated by Ram Thapa, showing latest."),
    ).toBeInTheDocument();
    const cachedBoard = queryClient.getQueryData<{ slots: OutfitBoard["slots"] }>(
      outfitQueryKey("outfit-1"),
    );
    expect(cachedBoard?.slots[0]?.items).toEqual([]);
  });

  it("explains a slot rule right away without asking the server", async () => {
    const placeRequested = vi.fn();
    mswServer.use(
      http.put("/api/outfits/outfit-1/slots/top/positions/0", () => {
        placeRequested();
        return ok({});
      }),
    );
    renderBoard(
      buildBoard({
        maxItemsPerMember: 1,
        slots: [
          buildSlot(),
          buildSlot({
            key: "footwear",
            label: "Footwear",
            productTypeIds: ["type-footwear"],
            items: [
              {
                position: 0,
                product: {
                  id: JUTTIS.id,
                  name: JUTTIS.name,
                  imageUrl: null,
                  price: 3_200,
                  listPrice: 3_200,
                  productTypeId: "type-footwear",
                  brand: { id: "brand-1", name: "Kathmandu Threads" },
                  availability: "IN_STOCK",
                  sizes: [],
                },
                addedBy: SITA,
                addedAt: "2026-09-30T10:05:00.000Z",
              },
            ],
          }),
        ],
      }),
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add to Top" }));
    await user.click(
      await within(await screen.findByRole("dialog")).findByRole("button", {
        name: /Maroon Kurta/,
      }),
    );

    expect(
      await screen.findByText("You've added as many items as the owner allows per person."),
    ).toBeInTheDocument();
    expect(placeRequested).not.toHaveBeenCalled();
  });

  it("warns about a sold-out item and swaps it for a suggested replacement", async () => {
    const soldOutKurta = outfitProduct({ availability: "OUT_OF_STOCK" });
    const replacement = outfitProduct({ id: "product-silk", name: "Silk Kurta", price: 3_000 });
    const placedProductIds: unknown[] = [];
    mswServer.use(
      http.get("/api/outfits/outfit-1/slots/top/positions/0/replacements", () =>
        ok({ products: [replacement] }),
      ),
      http.put("/api/outfits/outfit-1/slots/top/positions/0", async ({ request }) => {
        const body: unknown = await request.json();
        placedProductIds.push(
          typeof body === "object" && body && "productId" in body ? body.productId : null,
        );
        return ok({ version: 5, board: null });
      }),
      http.get("/api/outfits/outfit-1", () => ok({ ...buildBoard({ version: 5 }), kind: "board" })),
    );
    renderBoard(
      buildBoard({
        itemCount: 1,
        slots: [
          buildSlot({
            items: [
              {
                position: 0,
                product: soldOutKurta,
                addedBy: SITA,
                addedAt: "2026-09-30T10:05:00.000Z",
              },
            ],
          }),
        ],
      }),
    );
    const user = userEvent.setup();

    expect(
      screen.getByText("1 item has sold out. Swap them to lock the build."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Swap Maroon Kurta" }));
    const picker = await screen.findByRole("dialog", { name: "Swap Maroon Kurta" });
    await user.click(await within(picker).findByRole("button", { name: /Silk Kurta/ }));

    await waitFor(() => expect(placedProductIds).toEqual([replacement.id]));
  });

  it("says whether each item comes in the person's saved size", async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { user: { id: SITA.id } },
      isAuthenticated: true,
    } as ReturnType<typeof useAuth>);
    mswServer.use(
      http.get("/api/saved-sizes/me", () =>
        ok([
          {
            productTypeId: "type-tops",
            productTypeSlug: "tops",
            productTypeLabel: "Tops",
            sizeOptions: ["S", "M", "L"],
            savedSize: "M",
            lastBoughtSize: null,
          },
        ]),
      ),
    );
    renderBoard(
      buildBoard({
        itemCount: 1,
        slots: [
          buildSlot({
            items: [
              {
                position: 0,
                product: outfitProduct({
                  sizes: [
                    { label: "M", isInStock: false },
                    { label: "L", isInStock: true },
                  ],
                }),
                addedBy: SITA,
                addedAt: "2026-09-30T10:05:00.000Z",
              },
            ],
          }),
        ],
      }),
    );

    expect(await screen.findByText("Your size M: sold out")).toBeInTheDocument();
  });

  it("only shows the board read-only to someone watching from the chat", () => {
    renderBoard(buildBoard({ myRole: "VIEWER" }));

    expect(screen.queryByRole("button", { name: "Add to Top" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lock build" })).not.toBeInTheDocument();
  });
});
