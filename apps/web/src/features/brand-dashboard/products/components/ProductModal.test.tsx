import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as PendingPhotoHooks from "@/shared/hooks/usePendingPhotos";

import type * as SizeStandardHooks from "../hooks/useSizeStandards";
import { ProductModal } from "./ProductModal";

const mocks = vi.hoisted(() => ({
  createProduct: vi.fn(),
  resolvePendingPhotoAssets: vi.fn(),
  scrollIntoView: vi.fn(),
}));

vi.mock("../hooks/useCreateProduct", () => ({
  useCreateProduct: () => ({
    mutateAsync: mocks.createProduct,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/features/products/hooks/useProductTypes", () => ({
  useAssignableProductTypes: () => ({ data: [], isPending: false }),
}));

vi.mock("@/features/categories/hooks/useCategories", () => ({
  useCategories: () => ({ data: [], isPending: false }),
}));

vi.mock("../hooks/useSizeStandards", async (importOriginal) => ({
  ...(await importOriginal<typeof SizeStandardHooks>()),
  useSizeStandards: () => ({
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/shared/hooks/usePendingPhotos", async (importOriginal) => ({
  ...(await importOriginal<typeof PendingPhotoHooks>()),
  resolvePendingPhotoAssets: mocks.resolvePendingPhotoAssets,
}));

vi.mock("@/shared/components/PhotoCropPane", () => ({ PhotoCropPane: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = mocks.scrollIntoView;
});

describe("ProductModal submit", () => {
  it("shows and scrolls to the first problem without uploading photos or creating anything", async () => {
    render(<ProductModal open onClose={vi.fn()} />, { wrapper: createQueryClientWrapper() });

    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));

    const [firstProblem] = await screen.findAllByRole("alert");
    await waitFor(() => expect(mocks.scrollIntoView).toHaveBeenCalled());
    expect(mocks.scrollIntoView.mock.contexts[0]).toBe(firstProblem);
    expect(mocks.resolvePendingPhotoAssets).not.toHaveBeenCalled();
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });
});
