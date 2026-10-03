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

const ok = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const card = (overrides: Partial<PublicBuildCard> = {}): PublicBuildCard => ({
  id: "outfit-1",
  title: "Dashain look",
  previewImageUrls: [],
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

beforeEach(() => {
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
    await user.click(screen.getByLabelText("Everything in stock"));
    await user.selectOptions(screen.getByLabelText("Style"), "festive");

    await waitFor(() =>
      expect(requestedSearches.at(-1)).toBe("?category=festive&inStockOnly=true"),
    );
  });

  it("opens a build in a pop-up where people can like it and comment", async () => {
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
    await user.click(within(popup).getByRole("button", { name: /Like/ }));
    expect(await within(popup).findByRole("button", { name: /Liked/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.type(within(popup).getByLabelText("Add a comment"), "Love it");
    await user.click(within(popup).getByRole("button", { name: "Post" }));
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
