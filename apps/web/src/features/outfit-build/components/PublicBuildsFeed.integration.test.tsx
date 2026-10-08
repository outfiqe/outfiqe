import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import type { PublicBuildCard, PublicBuildDetail } from "../api/outfitSocialSchemas";
import { SITA } from "../testing/outfitFixtures";
import { PublicBuildsFeed } from "./PublicBuildsFeed";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const ok = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const card = (overrides: Partial<PublicBuildCard> = {}): PublicBuildCard => ({
  id: "outfit-1",
  title: "Dashain look",
  previewImageUrls: [],
  coverPhotos: [],
  itemCount: 2,
  total: 4_400,
  isFullyAvailable: true,
  contributors: [SITA],
  likeCount: 3,
  saveCount: 1,
  commentCount: 0,
  isLiked: false,
  isSaved: false,
  madePublicAt: "2026-10-01T10:00:00.000Z",
  ...overrides,
});

const detail = (overrides: Partial<PublicBuildDetail> = {}): PublicBuildDetail => ({
  ...card(),
  visibility: "PUBLIC",
  items: [
    {
      slotKey: "top",
      slotLabel: "Top",
      position: 0,
      productId: "product-kurta",
      productName: "Maroon Kurta",
      imageUrl: null,
      brandName: "Kathmandu Threads",
      unitPrice: 3_200,
      isInStock: true,
      sizes: [{ label: "M", isInStock: true }],
    },
  ],
  lockedAt: "2026-10-01T09:00:00.000Z",
  photos: [],
  canComment: true,
  ...overrides,
});

const renderFeed = () => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(
    <>
      <PublicBuildsFeed />
      <Toaster />
    </>,
    { wrapper: Wrapper },
  );
};

const pickFromMenu = async (
  user: ReturnType<typeof userEvent.setup>,
  menuName: RegExp,
  optionName: string,
) => {
  await user.click(screen.getByRole("button", { name: menuName }));
  await user.click(await screen.findByRole("radio", { name: optionName }));
};

beforeEach(() => {
  window.history.replaceState(null, "", "/explore?tab=builds");
  vi.mocked(useAuth).mockReturnValue({
    state: { user: { id: "viewer-1" } },
    isAuthenticated: true,
  } as ReturnType<typeof useAuth>);
  mswServer.use(
    http.get("/api/categories", () =>
      ok([{ id: "c1", slug: "festive", name: "Festive", imageUrl: null, productCount: 4 }]),
    ),
  );
});

describe("PublicBuildsFeed", () => {
  it("shows public builds with their total, contributors and counts", async () => {
    mswServer.use(http.get("/api/outfits/public", () => ok({ items: [card()], nextCursor: null })));
    renderFeed();

    expect(await screen.findByRole("heading", { name: "Dashain look" })).toBeInTheDocument();
    expect(screen.getByText("By Sita Rai")).toBeInTheDocument();
    expect(screen.getByText(/Rs 4,400/)).toBeInTheDocument();
    expect(screen.getByText("Fully available")).toBeInTheDocument();
  });

  it("leaves out the byline when nobody is credited on the build any more", async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { user: { id: "viewer-1" } },
      isAuthenticated: true,
      isShopper: true,
    } as ReturnType<typeof useAuth>);
    mswServer.use(
      http.get("/api/outfits/public", () =>
        ok({ items: [card({ contributors: [] })], nextCursor: null }),
      ),
      http.get("/api/outfits/outfit-1/public", () => ok(detail({ contributors: [] }))),
      http.get("/api/outfits/outfit-1/comments", () => ok({ items: [], nextCursor: null })),
    );
    renderFeed();
    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { name: "Dashain look" })).toBeInTheDocument();
    expect(screen.queryByText(/^By\b/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Dashain look" }));
    const popup = await screen.findByRole("dialog");
    expect(
      await within(popup).findByRole("heading", { name: "Buy this build" }),
    ).toBeInTheDocument();
    expect(within(popup).queryByRole("region", { name: "Built by" })).not.toBeInTheDocument();
  });

  it("asks the server again with the chosen filters", async () => {
    const requestedSearches: string[] = [];
    mswServer.use(
      http.get("/api/outfits/public", ({ request }) => {
        requestedSearches.push(new URL(request.url).search);
        return ok({ items: [], nextCursor: null });
      }),
    );
    renderFeed();
    const user = userEvent.setup();

    expect(await screen.findByText("No builds match yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Everything in stock" }));
    await pickFromMenu(user, /^Style/, "Festive");
    await pickFromMenu(user, /^Price/, "Rs 5,000–10,000");
    await pickFromMenu(user, /^Sort by/, "Price: low to high");

    await waitFor(() =>
      expect(requestedSearches.at(-1)).toBe(
        "?category=festive&minPrice=5000&maxPrice=9999&inStockOnly=true&sort=price-low",
      ),
    );
    expect(screen.getByRole("button", { name: /Style: Festive/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Price: Rs 5,000–10,000/ })).toBeInTheDocument();
    expect(window.location.search).toBe(
      "?tab=builds&style=festive&price=5k-10k&inStock=true&sort=price-low",
    );
  });

  it("starts from the filters in the link", async () => {
    window.history.replaceState(null, "", "/explore?tab=builds&style=festive&price=over-10k");
    const requestedSearches: string[] = [];
    mswServer.use(
      http.get("/api/outfits/public", ({ request }) => {
        requestedSearches.push(new URL(request.url).search);
        return ok({ items: [], nextCursor: null });
      }),
    );

    renderFeed();

    await waitFor(() => expect(requestedSearches[0]).toBe("?category=festive&minPrice=10000"));
    expect(screen.getByRole("button", { name: /Price: Rs 10,000\+/ })).toBeInTheDocument();
  });

  it("explains an empty filtered feed and clears the filters but keeps the sort", async () => {
    const requestedSearches: string[] = [];
    mswServer.use(
      http.get("/api/outfits/public", ({ request }) => {
        requestedSearches.push(new URL(request.url).search);
        return ok({ items: [], nextCursor: null });
      }),
    );
    renderFeed();
    const user = userEvent.setup();

    await screen.findByText("No builds match yet.");
    await pickFromMenu(user, /^Sort by/, "Most cheriqed");
    await pickFromMenu(user, /^Price/, "Under Rs 5,000");
    const emptyMessage = await screen.findByText("No builds match these filters.");
    const emptyState = emptyMessage.parentElement ?? document.body;
    await user.click(within(emptyState).getByRole("button", { name: "Clear filters" }));

    await waitFor(() => expect(requestedSearches.at(-1)).toBe("?sort=most-cheriqed"));
    expect(screen.getByRole("button", { name: /^Price$/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    expect(window.location.search).toBe("?tab=builds&sort=most-cheriqed");
  });

  it("opens a build in a pop-up where people can cheriq it and chime", async () => {
    const postedComments: unknown[] = [];
    let likeCount = 3;
    mswServer.use(
      http.get("/api/outfits/public", () => ok({ items: [card()], nextCursor: null })),
      http.get("/api/outfits/outfit-1/public", () => ok(detail({ likeCount }))),
      http.get("/api/outfits/outfit-1/comments", () => ok({ items: [], nextCursor: null })),
      http.put("/api/outfits/outfit-1/like", () => {
        likeCount = 4;
        return ok({ isLiked: true, likeCount });
      }),
      http.post("/api/outfits/outfit-1/comments", async ({ request }) => {
        postedComments.push(await request.json());
        return ok({
          id: "comment-1",
          body: "Love it",
          author: SITA,
          parentCommentId: null,
          replyCount: 0,
          createdAt: "2026-10-01T11:00:00.000Z",
          isMine: true,
        });
      }),
    );
    renderFeed();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Open Dashain look" }));
    const popup = await screen.findByRole("dialog");
    expect(await within(popup).findByText("Maroon Kurta")).toBeInTheDocument();
    await user.click(within(popup).getByRole("button", { name: /Cheriq/ }));
    expect(await within(popup).findByRole("button", { name: /Cheriqed/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.type(within(popup).getByLabelText("Add a chime"), "Love it");
    await user.click(within(popup).getByRole("button", { name: "Chime" }));
    await waitFor(() => expect(postedComments).toEqual([{ body: "Love it" }]));
  });

  it("explains a failure and can try again", async () => {
    mswServer.use(
      http.get("/api/outfits/public", () =>
        HttpResponse.json({ success: false, message: "Nope", code: "INTERNAL" }, { status: 500 }),
      ),
    );
    renderFeed();

    expect(await screen.findByText("Couldn't load builds. Try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
