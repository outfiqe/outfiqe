import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";
import { type PendingPhoto, usePendingPhotos } from "@/shared/hooks/usePendingPhotos";
import { ApiClientError } from "@/shared/lib/apiClient";

import { PostModal } from "./PostModal";

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const resolvePendingPhotoUrls = vi.fn();
const removePhoto = vi.fn();
const reset = vi.fn();
const setActiveId = vi.fn();

vi.mock("@/shared/hooks/usePendingPhotos", () => ({
  usePendingPhotos: vi.fn(),
  resolvePendingPhotoUrls: (...args: unknown[]) => resolvePendingPhotoUrls(...args),
}));

const buildExistingPhoto = (id: string): PendingPhoto => ({
  id,
  url: `blob:${id}`,
  file: null,
  crop: { x: 0, y: 0 },
  zoom: 1,
  croppedAreaPixels: null,
});

const mockPending = (photos: PendingPhoto[]) => {
  vi.mocked(usePendingPhotos).mockReturnValue({
    photos,
    activePhoto: photos[0] ?? null,
    setActiveId,
    inputRef: { current: null },
    handleFileSelect: vi.fn(),
    removePhoto,
    updateActivePhoto: vi.fn(),
    reset,
  });
};

const onClose = vi.fn();

const searchAndSelectProduct = async (
  user: ReturnType<typeof userEvent.setup>,
  query: string,
  optionName: RegExp,
) => {
  await user.type(screen.getByPlaceholderText("Search products to tag…"), query);
  await user.click(await screen.findByRole("option", { name: optionName }));
};

const renderModal = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PostModal open onClose={onClose} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  onClose.mockClear();
  reset.mockClear();
  resolvePendingPhotoUrls.mockReset();
  vi.mocked(useAuth).mockReturnValue({
    state: { user: { id: "creator-1", name: "Ava Martinez" } },
  } as ReturnType<typeof useAuth>);
  mockPending([]);
});

describe("PostModal", () => {
  it("disables Post look until at least one photo is staged", () => {
    mockPending([]);
    renderModal();

    expect(screen.getByRole("button", { name: "Post look" })).toBeDisabled();
  });

  it("enables Post look once a photo is staged", () => {
    mockPending([buildExistingPhoto("p1")]);
    renderModal();

    expect(screen.getByRole("button", { name: "Post look" })).toBeEnabled();
  });

  it("posts the look through the real API and closes on success", async () => {
    resolvePendingPhotoUrls.mockResolvedValue(["https://cdn.outfiqe.test/p1.jpg"]);
    mockPending([buildExistingPhoto("p1")]);
    mswServer.use(
      http.post("/api/creator-looks", async ({ request }) => {
        const body = (await request.json()) as { imageUrls: string[] };
        expect(body.imageUrls).toEqual(["https://cdn.outfiqe.test/p1.jpg"]);
        return HttpResponse.json({
          success: true,
          message: "Look posted.",
          data: {
            id: "look-1",
            imageUrl: "https://cdn.outfiqe.test/p1.jpg",
            caption: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            taggedProducts: [],
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Post look" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(reset).toHaveBeenCalledOnce();
  });

  it("surfaces the upload error message and doesn't submit when resolving photos fails", async () => {
    resolvePendingPhotoUrls.mockRejectedValue(
      new ApiClientError("Each image must be 5 MB or smaller.", "INVALID_FILE"),
    );
    mockPending([buildExistingPhoto("p1")]);

    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Post look" }));

    expect(await screen.findByText("Each image must be 5 MB or smaller.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the API error banner when the create request fails", async () => {
    resolvePendingPhotoUrls.mockResolvedValue(["https://cdn.outfiqe.test/p1.jpg"]);
    mockPending([buildExistingPhoto("p1")]);
    mswServer.use(
      http.post("/api/creator-looks", () =>
        HttpResponse.json(
          { success: false, message: "Only approved creators can post looks." },
          { status: 403 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Post look" }));

    expect(await screen.findByText("Only approved creators can post looks.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("resets local state and calls onClose when Cancel is clicked", async () => {
    mockPending([buildExistingPhoto("p1")]);
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledOnce();
  });

  it("tags a product found through the real product search", async () => {
    mswServer.use(
      http.get("/api/products", ({ request }) => {
        expect(new URL(request.url).searchParams.get("q")).toBe("denim");
        return HttpResponse.json({
          success: true,
          message: "Products.",
          data: {
            products: [
              {
                id: "product-1",
                brand: "Studio Nine",
                name: "Denim Jacket",
                price: 4500,
                type: "tops",
                categorySlugs: [],
                imageUrl: null,
                lowStock: false,
                isNew: false,
                creatorBuyerCount: 0,
                unitsSold: 0,
                avgRating: null,
                reviewCount: 0,
              },
            ],
            nextCursor: null,
            total: 1,
            brandCount: 1,
          },
        });
      }),
    );

    mockPending([buildExistingPhoto("p1")]);
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Tag a product" }));
    await searchAndSelectProduct(user, "denim", /Denim Jacket/);

    expect(screen.getByRole("button", { name: "1 product tagged" })).toBeInTheDocument();
  });

  const denimProduct = {
    id: "product-1",
    brand: "Studio Nine",
    name: "Denim Jacket",
    price: 4500,
    type: "tops",
    categorySlugs: [],
    imageUrl: null,
    lowStock: false,
    isNew: false,
    creatorBuyerCount: 0,
    unitsSold: 0,
    avgRating: null,
    reviewCount: 0,
  };

  it("untags a product when it's selected again from search results", async () => {
    mswServer.use(
      http.get("/api/products", () =>
        HttpResponse.json({
          success: true,
          message: "Products.",
          data: { products: [denimProduct], nextCursor: null, total: 1, brandCount: 1 },
        }),
      ),
    );

    mockPending([buildExistingPhoto("p1")]);
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Tag a product" }));
    await searchAndSelectProduct(user, "denim", /Denim Jacket/);
    await user.click(screen.getByRole("option", { name: /Denim Jacket/ }));

    expect(screen.getByRole("button", { name: "Tag a product" })).toBeInTheDocument();
  });

  it("updates the size worn for a tagged product", async () => {
    mswServer.use(
      http.get("/api/products", () =>
        HttpResponse.json({
          success: true,
          message: "Products.",
          data: { products: [denimProduct], nextCursor: null, total: 1, brandCount: 1 },
        }),
      ),
    );

    mockPending([buildExistingPhoto("p1")]);
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Tag a product" }));
    await searchAndSelectProduct(user, "denim", /Denim Jacket/);
    await user.type(screen.getByPlaceholderText("Size (e.g. M)"), "L");

    expect(screen.getByPlaceholderText("Size (e.g. M)")).toHaveValue("L");
  });

  it("removes a tagged product via its own remove control", async () => {
    mswServer.use(
      http.get("/api/products", () =>
        HttpResponse.json({
          success: true,
          message: "Products.",
          data: { products: [denimProduct], nextCursor: null, total: 1, brandCount: 1 },
        }),
      ),
    );

    mockPending([buildExistingPhoto("p1")]);
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Tag a product" }));
    await searchAndSelectProduct(user, "denim", /Denim Jacket/);
    await user.click(screen.getByRole("button", { name: "Remove Denim Jacket tag" }));

    expect(screen.getByRole("button", { name: "Tag a product" })).toBeInTheDocument();
  });

  it("shows a posting state while the create request is in flight", async () => {
    resolvePendingPhotoUrls.mockResolvedValue(["https://cdn.outfiqe.test/p1.jpg"]);
    mockPending([buildExistingPhoto("p1")]);
    mswServer.use(
      http.post("/api/creator-looks", async () => {
        await delay(200);
        return HttpResponse.json({
          success: true,
          message: "Look posted.",
          data: {
            id: "look-1",
            imageUrl: "https://cdn.outfiqe.test/p1.jpg",
            caption: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            taggedProducts: [],
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Post look" }));

    expect(await screen.findByText("Posting…")).toBeInTheDocument();
  });

  it("shows a processing state while photos are being resolved", async () => {
    resolvePendingPhotoUrls.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(["https://cdn.outfiqe.test/p1.jpg"]), 200),
        ),
    );
    mockPending([buildExistingPhoto("p1")]);
    mswServer.use(
      http.post("/api/creator-looks", () =>
        HttpResponse.json({
          success: true,
          message: "Look posted.",
          data: {
            id: "look-1",
            imageUrl: "https://cdn.outfiqe.test/p1.jpg",
            caption: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            taggedProducts: [],
          },
        }),
      ),
    );

    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Post look" }));

    expect(await screen.findByText("Processing…")).toBeInTheDocument();
  });
});
