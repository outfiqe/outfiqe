import type * as DesignSystemModule from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { CreatorLookEditDetail } from "../api/creatorLooksSchemas";
import { EditPostForm } from "./EditPostForm";

const getCroppedImageFile = vi.fn();

vi.mock("@outfiqe/design-system", async (importOriginal) => {
  const actual = await importOriginal<typeof DesignSystemModule>();
  return {
    ...actual,
    getCroppedImageFile: (...args: unknown[]) => getCroppedImageFile(...args),
    CropSurface: ({
      crop,
      onCropChange,
      zoom,
      onZoomChange,
      onCropComplete,
    }: {
      crop: { x: number; y: number };
      onCropChange: (crop: { x: number; y: number }) => void;
      zoom: number;
      onZoomChange: (zoom: number) => void;
      onCropComplete: (crop: { x: number; y: number; width: number; height: number }) => void;
    }) => (
      <div>
        Crop surface
        <button type="button" onClick={() => onCropChange({ x: crop.x + 1, y: crop.y })}>
          Adjust crop
        </button>
        <button type="button" onClick={() => onZoomChange(zoom + 1)}>
          Adjust zoom
        </button>
        <button
          type="button"
          onClick={() => onCropComplete({ x: 0, y: 0, width: 100, height: 125 })}
        >
          Finish crop
        </button>
      </div>
    ),
  };
});

const buildDetail = (overrides: Partial<CreatorLookEditDetail> = {}): CreatorLookEditDetail => ({
  id: "look-1",
  imageUrls: ["https://cdn.outfiqe.test/existing.jpg"],
  caption: "A great fit",
  taggedProducts: [
    {
      productId: "product-1",
      sizeWorn: "M",
      product: {
        id: "product-1",
        name: "Denim Jacket",
        brand: "Studio Nine",
        price: 4500,
        imageUrl: null,
      },
    },
  ],
  ...overrides,
});

const buildImageFile = (name = "photo.jpg") =>
  new File(["fake-bytes"], name, { type: "image/jpeg" });

const searchAndSelectProduct = async (
  user: ReturnType<typeof userEvent.setup>,
  query: string,
  optionName: RegExp,
) => {
  await user.type(screen.getByPlaceholderText("Search products to tag…"), query);
  await user.click(await screen.findByRole("option", { name: optionName }));
};

const renderForm = (detail: CreatorLookEditDetail, onClose = vi.fn()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <EditPostForm lookId={detail.id} detail={detail} onClose={onClose} />
      </QueryClientProvider>,
    ),
  };
};

describe("EditPostForm", () => {
  it("shows the existing photo count and caption", () => {
    renderForm(buildDetail());

    expect(screen.getByText("1/6 photos")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Write your caption here….")).toHaveValue("A great fit");
  });

  it("shows the existing tagged product with its size", () => {
    renderForm(buildDetail());

    expect(screen.getByRole("button", { name: "1 product tagged" })).toBeInTheDocument();
  });

  it("updates the size worn for an already-tagged product", async () => {
    const user = userEvent.setup();
    renderForm(buildDetail());

    await user.click(screen.getByRole("button", { name: "1 product tagged" }));
    const sizeInput = screen.getByPlaceholderText("Size (e.g. M)");
    await user.clear(sizeInput);
    await user.type(sizeInput, "L");

    expect(sizeInput).toHaveValue("L");
  });

  it("removes an already-tagged product via its own remove control", async () => {
    const user = userEvent.setup();
    renderForm(buildDetail());

    await user.click(screen.getByRole("button", { name: "1 product tagged" }));
    await user.click(screen.getByRole("button", { name: "Remove Denim Jacket tag" }));

    expect(screen.getByRole("button", { name: "Tag a product" })).toBeInTheDocument();
  });

  it("tags an additional product found through search, then untags it by searching again", async () => {
    mswServer.use(
      http.get("/api/products", () =>
        HttpResponse.json({
          success: true,
          message: "Products.",
          data: {
            products: [
              {
                id: "product-2",
                brand: "Studio Nine",
                name: "Wool Scarf",
                price: 1200,
                type: "outerwear",
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
        }),
      ),
    );

    const user = userEvent.setup();
    renderForm(buildDetail());

    await user.click(screen.getByRole("button", { name: "1 product tagged" }));
    await searchAndSelectProduct(user, "scarf", /Wool Scarf/);

    expect(screen.getByRole("button", { name: "2 products tagged" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search products to tag…")).toHaveValue("");

    await searchAndSelectProduct(user, "scarf", /Wool Scarf/);

    expect(screen.getByRole("button", { name: "1 product tagged" })).toBeInTheDocument();
  });

  it("removes an existing photo when its remove control is clicked", async () => {
    const user = userEvent.setup();
    renderForm(buildDetail());

    await user.click(screen.getByRole("button", { name: "Remove photo" }));

    expect(screen.getByText("0/6 photos")).toBeInTheDocument();
  });

  it("clicking Add triggers the hidden file input", async () => {
    const user = userEvent.setup();
    const { container } = renderForm(buildDetail());
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");

    await user.click(screen.getByRole("button", { name: "Add a photo" }));

    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it("stages a newly added photo behind a crop confirmation step", async () => {
    const user = userEvent.setup();
    const { container } = renderForm(buildDetail());
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, buildImageFile());

    expect(screen.getByText("Crop surface")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use photo" })).toBeInTheDocument();
  });

  it("adds the staged photo to the count once confirmed", async () => {
    const user = userEvent.setup();
    const { container } = renderForm(buildDetail());
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, buildImageFile());

    await user.click(screen.getByRole("button", { name: "Use photo" }));

    expect(screen.getByText("2/6 photos")).toBeInTheDocument();
    expect(screen.queryByText("Crop surface")).not.toBeInTheDocument();
  });

  it("removes a newly added photo before saving", async () => {
    const user = userEvent.setup();
    const { container } = renderForm(buildDetail());
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, buildImageFile());
    await user.click(screen.getByRole("button", { name: "Use photo" }));
    expect(screen.getByText("2/6 photos")).toBeInTheDocument();

    const removeButtons = screen.getAllByRole("button", { name: "Remove photo" });
    await user.click(removeButtons[removeButtons.length - 1]!);

    expect(screen.getByText("1/6 photos")).toBeInTheDocument();
  });

  it("lets the crop position, zoom, and area be adjusted before confirming", async () => {
    const user = userEvent.setup();
    const { container } = renderForm(buildDetail());
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, buildImageFile());

    await user.click(screen.getByRole("button", { name: "Adjust crop" }));
    await user.click(screen.getByRole("button", { name: "Adjust zoom" }));
    await user.click(screen.getByRole("button", { name: "Finish crop" }));
    await user.click(screen.getByRole("button", { name: "Use photo" }));

    expect(screen.getByText("2/6 photos")).toBeInTheDocument();
  });

  it("crops the confirmed photo through getCroppedImageFile before uploading on save", async () => {
    getCroppedImageFile.mockResolvedValue(buildImageFile("cropped.jpg"));
    mswServer.use(
      http.post("/api/uploads", () =>
        HttpResponse.json({
          success: true,
          message: "Uploaded.",
          data: { files: [{ url: "https://cdn.outfiqe.test/cropped.jpg", key: "cropped" }] },
        }),
      ),
      http.patch("/api/creator-looks/look-1", async ({ request }) => {
        const body = (await request.json()) as { imageUrls: string[] };
        expect(body.imageUrls).toContain("https://cdn.outfiqe.test/cropped.jpg");
        return HttpResponse.json({
          success: true,
          message: "Post updated.",
          data: {
            id: "look-1",
            imageUrl: "https://cdn.outfiqe.test/existing.jpg",
            caption: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            taggedProducts: [],
          },
        });
      }),
    );

    const user = userEvent.setup();
    const { container, onClose } = renderForm(buildDetail());
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, buildImageFile());
    await user.click(screen.getByRole("button", { name: "Finish crop" }));
    await user.click(screen.getByRole("button", { name: "Use photo" }));

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(getCroppedImageFile).toHaveBeenCalledOnce();
  });

  it("discards the staged photo when crop is cancelled", async () => {
    const user = userEvent.setup();
    const { container } = renderForm(buildDetail());
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, buildImageFile());

    const [stagingCancel] = screen.getAllByRole("button", { name: "Cancel" });
    await user.click(stagingCancel!);

    expect(screen.getByText("1/6 photos")).toBeInTheDocument();
    expect(screen.queryByText("Crop surface")).not.toBeInTheDocument();
  });

  it("blocks saving with zero photos and shows a validation message", async () => {
    const user = userEvent.setup();
    renderForm(buildDetail());
    await user.click(screen.getByRole("button", { name: "Remove photo" }));

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Add at least one photo.")).toBeInTheDocument();
  });

  it("saves through the real update and upload APIs, then closes", async () => {
    mswServer.use(
      http.post("/api/uploads", () =>
        HttpResponse.json({
          success: true,
          message: "Uploaded.",
          data: { files: [{ url: "https://cdn.outfiqe.test/new.jpg", key: "new" }] },
        }),
      ),
      http.patch("/api/creator-looks/look-1", async ({ request }) => {
        const body = (await request.json()) as { imageUrls: string[]; caption?: string };
        expect(body.imageUrls).toEqual([
          "https://cdn.outfiqe.test/existing.jpg",
          "https://cdn.outfiqe.test/new.jpg",
        ]);
        return HttpResponse.json({
          success: true,
          message: "Post updated.",
          data: {
            id: "look-1",
            imageUrl: "https://cdn.outfiqe.test/existing.jpg",
            caption: body.caption ?? null,
            createdAt: "2026-01-01T00:00:00.000Z",
            taggedProducts: [],
          },
        });
      }),
    );

    const user = userEvent.setup();
    const { container, onClose } = renderForm(buildDetail());
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, buildImageFile());
    await user.click(screen.getByRole("button", { name: "Use photo" }));

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("shows a saving state while the update request is in flight", async () => {
    mswServer.use(
      http.patch("/api/creator-looks/look-1", async () => {
        await delay(200);
        return HttpResponse.json({
          success: true,
          message: "Post updated.",
          data: {
            id: "look-1",
            imageUrl: "https://cdn.outfiqe.test/existing.jpg",
            caption: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            taggedProducts: [],
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderForm(buildDetail());

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Saving…")).toBeInTheDocument();
  });

  it("shows an error banner when the update request fails", async () => {
    mswServer.use(
      http.patch("/api/creator-looks/look-1", () =>
        HttpResponse.json(
          { success: false, message: "This post no longer exists." },
          { status: 404 },
        ),
      ),
    );

    const user = userEvent.setup();
    const { onClose } = renderForm(buildDetail());

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("This post no longer exists.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Cancel is clicked without saving", async () => {
    const user = userEvent.setup();
    const { onClose } = renderForm(buildDetail());

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
