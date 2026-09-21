import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreatorStatus } from "@/features/auth/types";
import type { PublicProduct } from "@/features/products/api/productSchemas";

import type { CreatorLink } from "../api/creatorLinksSchemas";
import { CreatorLinkStatus, CreatorLinkType } from "../api/creatorLinksSchemas";
import { useMyCreatorLinks } from "../hooks/useMyCreatorLinks";
import { ShareSection } from "./ShareSection";

vi.mock("../hooks/useMyCreatorLinks", () => ({
  useMyCreatorLinks: vi.fn(),
}));

vi.mock("./CreatorStatusGate", () => ({
  CreatorStatusGate: ({ creatorStatus }: { creatorStatus: string }) => (
    <div>Status gate for {creatorStatus}</div>
  ),
}));

vi.mock("./ShareProductPicker", () => ({
  ShareProductPicker: ({
    selectedProduct,
    onSelect,
  }: {
    selectedProduct: PublicProduct | null;
    onSelect: (product: PublicProduct | null) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect(
          selectedProduct
            ? null
            : {
                id: "product-1",
                brand: "Studio Nine",
                name: "Denim Jacket",
                price: 4500,
                effectivePrice: 4500,
                discountPercent: null,
                type: "tops",
                categorySlugs: [],
                imageUrl: null,
                lowStock: false,
                isNew: false,
                isSaved: false,
                isThrift: false,
                thriftConditionRating: null,
                thriftConditionNotes: null,
                isSoldOut: false,
                creatorBuyerCount: 0,
                unitsSold: 0,
                avgRating: null,
                reviewCount: 0,
              },
        )
      }
    >
      {selectedProduct ? `Selected: ${selectedProduct.name}` : "Pick a product"}
    </button>
  ),
}));

const buildLink = (id: string): CreatorLink => ({
  id,
  token: `token-${id}`,
  shareUrl: `https://outfiqe.test/r/${id}`,
  type: CreatorLinkType.EXTERNAL_REUSABLE,
  status: CreatorLinkStatus.ACTIVE,
  productId: "product-1",
  productName: "Denim Jacket",
  clickCount: 2,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const fetchNextPage = vi.fn();

const refetch = vi.fn();

const mockMyCreatorLinks = (overrides: Partial<ReturnType<typeof useMyCreatorLinks>> = {}) => {
  vi.mocked(useMyCreatorLinks).mockReturnValue({
    data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
    isPending: false,
    isError: false,
    error: null,
    refetch,
    hasNextPage: false,
    fetchNextPage,
    isFetchingNextPage: false,
    ...overrides,
  } as ReturnType<typeof useMyCreatorLinks>);
};

const renderSection = (creatorStatus: CreatorStatus = CreatorStatus.APPROVED) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ShareSection creatorStatus={creatorStatus} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  fetchNextPage.mockClear();
  refetch.mockClear();
  mockMyCreatorLinks();
});

describe("ShareSection", () => {
  it("shows the creator status gate for a non-approved creator", () => {
    renderSection(CreatorStatus.PENDING);

    expect(screen.getByText("Status gate for PENDING")).toBeInTheDocument();
  });

  it("shows an empty state when the creator has no links yet", () => {
    renderSection();

    expect(
      screen.getByText("No links generated yet — share a product above to get started."),
    ).toBeInTheDocument();
  });

  it("lists every existing link", () => {
    mockMyCreatorLinks({
      data: { pages: [{ items: [buildLink("l1")], nextCursor: null }], pageParams: [undefined] },
    });

    renderSection();

    expect(screen.getByText("Denim Jacket")).toBeInTheDocument();
    expect(screen.getByText(/reusable link · 2 clicks/)).toBeInTheDocument();
  });

  it("renders singular clicks, an inactive status and the profile fallback label", () => {
    mockMyCreatorLinks({
      data: {
        pages: [
          {
            items: [
              {
                ...buildLink("l2"),
                clickCount: 1,
                status: CreatorLinkStatus.REVOKED,
                productName: null,
              },
            ],
            nextCursor: null,
          },
        ],
        pageParams: [undefined],
      },
    });

    renderSection();

    expect(screen.getByText("Your profile")).toBeInTheDocument();
    expect(screen.getByText(/· 1 click · revoked$/)).toBeInTheDocument();
  });

  it("shows a load-more button that calls fetchNextPage", async () => {
    mockMyCreatorLinks({
      hasNextPage: true,
      data: { pages: [{ items: [buildLink("l1")], nextCursor: "l1" }], pageParams: [undefined] },
    });
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it("gets a profile link through the real API and displays it", async () => {
    mswServer.use(
      http.post("/api/creator-links/external", async ({ request }) => {
        const body = (await request.json()) as { productId?: string };
        expect(body.productId).toBeUndefined();
        return HttpResponse.json({
          success: true,
          message: "Link ready.",
          data: {
            id: "profile-link",
            token: "profile-token",
            shareUrl: "https://outfiqe.test/r/profile-token",
            type: "EXTERNAL_REUSABLE",
            status: "ACTIVE",
            productId: null,
            productName: null,
            clickCount: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Get my profile link" }));

    expect(await screen.findByText("https://outfiqe.test/r/profile-token")).toBeInTheDocument();
  });

  it("only shows the generate-link buttons once a product is selected", async () => {
    const user = userEvent.setup();
    renderSection();

    expect(
      screen.queryByRole("button", { name: "Generate one-time link" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pick a product" }));

    expect(screen.getByRole("button", { name: "Generate one-time link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get reusable link" })).toBeInTheDocument();
  });

  it("creates a one-time link through the real API and displays it", async () => {
    mswServer.use(
      http.post("/api/creator-links/internal", async ({ request }) => {
        const body = (await request.json()) as { productId: string };
        expect(body.productId).toBe("product-1");
        return HttpResponse.json({
          success: true,
          message: "One-time link created.",
          data: {
            id: "internal-link",
            token: "internal-token",
            shareUrl: "https://outfiqe.test/r/internal-token",
            type: "INTERNAL_SINGLE_USE",
            status: "ACTIVE",
            productId: "product-1",
            productName: "Denim Jacket",
            clickCount: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("button", { name: "Pick a product" }));

    await user.click(screen.getByRole("button", { name: "Generate one-time link" }));

    expect(await screen.findByText("https://outfiqe.test/r/internal-token")).toBeInTheDocument();
  });

  it("creates a reusable product link through the real API and displays it", async () => {
    mswServer.use(
      http.post("/api/creator-links/external", async ({ request }) => {
        const body = (await request.json()) as { productId?: string };
        expect(body.productId).toBe("product-1");
        return HttpResponse.json({
          success: true,
          message: "Reusable link ready.",
          data: {
            id: "external-link",
            token: "external-token",
            shareUrl: "https://outfiqe.test/r/external-token",
            type: "EXTERNAL_REUSABLE",
            status: "ACTIVE",
            productId: "product-1",
            productName: "Denim Jacket",
            clickCount: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("button", { name: "Pick a product" }));

    await user.click(screen.getByRole("button", { name: "Get reusable link" }));

    expect(await screen.findByText("https://outfiqe.test/r/external-token")).toBeInTheDocument();
  });

  it("shows an error toast and clears loading state when link creation fails", async () => {
    mswServer.use(
      http.post("/api/creator-links/internal", () =>
        HttpResponse.json({ success: false, message: "Product not available." }, { status: 404 }),
      ),
    );

    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("button", { name: "Pick a product" }));

    await user.click(screen.getByRole("button", { name: "Generate one-time link" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Generate one-time link" })).not.toBeDisabled(),
    );
  });

  it("clears loading state and shows no link when the reusable-link request fails", async () => {
    mswServer.use(
      http.post("/api/creator-links/external", () =>
        HttpResponse.json({ success: false, message: "Product not available." }, { status: 404 }),
      ),
    );

    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole("button", { name: "Pick a product" }));

    await user.click(screen.getByRole("button", { name: "Get reusable link" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Get reusable link" })).not.toBeDisabled(),
    );
    expect(screen.queryByText(/outfiqe.test\/r\//)).not.toBeInTheDocument();
  });

  it("clears loading state when the profile-link request fails", async () => {
    mswServer.use(
      http.post("/api/creator-links/external", () =>
        HttpResponse.json({ success: false, message: "Server error." }, { status: 500 }),
      ),
    );

    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Get my profile link" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Get my profile link" })).not.toBeDisabled(),
    );
  });

  it("shows a real error banner instead of the empty state when the links fetch fails", () => {
    mockMyCreatorLinks({ isError: true, error: new Error("Network error"), data: undefined });

    renderSection();

    expect(screen.getByText(/Couldn't load your links/)).toBeInTheDocument();
    expect(
      screen.queryByText("No links generated yet — share a product above to get started."),
    ).not.toBeInTheDocument();
  });

  it("retries the links fetch when Try again is clicked on the error banner", async () => {
    mockMyCreatorLinks({ isError: true, error: new Error("Network error"), data: undefined });
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(refetch).toHaveBeenCalledOnce();
  });

  it("shows loading skeletons instead of the link list while pending", () => {
    mockMyCreatorLinks({ isPending: true, data: undefined });

    renderSection();

    expect(
      screen.queryByText("No links generated yet — share a product above to get started."),
    ).not.toBeInTheDocument();
  });

  describe("deleting a link", () => {
    const mockOneLink = () =>
      mockMyCreatorLinks({
        data: { pages: [{ items: [buildLink("l1")], nextCursor: null }], pageParams: [undefined] },
      });

    it("asks for confirmation and deletes the link once confirmed", async () => {
      mockOneLink();
      const deleteRequested = vi.fn();
      mswServer.use(
        http.delete("/api/creator-links/l1", () => {
          deleteRequested();
          return HttpResponse.json({ success: true, message: "Link deleted.", data: null });
        }),
      );
      const user = userEvent.setup();
      renderSection();

      await user.click(screen.getByRole("button", { name: "Delete Denim Jacket" }));
      expect(screen.getByRole("dialog", { name: "Delete link" })).toBeInTheDocument();
      expect(deleteRequested).not.toHaveBeenCalled();

      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

      await waitFor(() => expect(deleteRequested).toHaveBeenCalledOnce());
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("does not delete anything when the confirmation is cancelled", async () => {
      mockOneLink();
      const deleteRequested = vi.fn();
      mswServer.use(
        http.delete("/api/creator-links/l1", () => {
          deleteRequested();
          return HttpResponse.json({ success: true, message: "Link deleted.", data: null });
        }),
      );
      const user = userEvent.setup();
      renderSection();

      await user.click(screen.getByRole("button", { name: "Delete Denim Jacket" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(deleteRequested).not.toHaveBeenCalled();
    });

    it("keeps the confirmation open when the server rejects the delete", async () => {
      mockOneLink();
      mswServer.use(
        http.delete("/api/creator-links/l1", () =>
          HttpResponse.json(
            {
              success: false,
              message: "This link is no longer available.",
              code: "LINK_NOT_FOUND",
            },
            { status: 404 },
          ),
        ),
      );
      const user = userEvent.setup();
      renderSection();

      await user.click(screen.getByRole("button", { name: "Delete Denim Jacket" }));
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

      await waitFor(() =>
        expect(
          within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }),
        ).toBeEnabled(),
      );
      expect(screen.getByRole("dialog", { name: "Delete link" })).toBeInTheDocument();
    });
  });
});
