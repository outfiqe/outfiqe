import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";
import { type PendingPhoto, usePendingPhotos } from "@/shared/hooks/usePendingPhotos";

import type { OutfitBoard } from "../../api/outfitSchemas";
import { buildBoard, buildSlot, outfitProduct, SITA } from "../../testing/outfitFixtures";
import { PostAsLookPanel } from "./PostAsLookPanel";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

const resolvePendingPhotoAssets = vi.fn();

vi.mock("@/shared/hooks/usePendingPhotos", () => ({
  usePendingPhotos: vi.fn(),
  resolvePendingPhotoAssets: (...args: unknown[]) => resolvePendingPhotoAssets(...args),
}));

const MY_LOOK_URL = "/api/outfits/outfit-1/look";

const ok = (data: unknown, status = 200) =>
  HttpResponse.json({ success: true, message: "ok", data }, { status });

const STAGED_PHOTO: PendingPhoto = {
  id: "photo-1",
  url: "blob:photo-1",
  file: null,
  crop: { x: 0, y: 0 },
  zoom: 1,
  croppedAreaPixels: null,
};

const mockAuth = ({ isCreator }: { isCreator: boolean }) => {
  vi.mocked(useAuth).mockReturnValue({
    state: { user: { id: SITA.id, handle: "sita" } },
    isCreator,
    isAuthenticated: false,
  } as ReturnType<typeof useAuth>);
};

const lockedBoard = (): OutfitBoard =>
  buildBoard({
    status: "LOCKED",
    itemCount: 1,
    lastLockedVersion: 4,
    slots: [
      buildSlot({
        items: [
          {
            position: 0,
            product: outfitProduct({
              sizes: [
                { label: "S", isInStock: true },
                { label: "M", isInStock: true },
              ],
            }),
            addedBy: SITA,
            addedAt: "2026-09-30T10:05:00.000Z",
          },
        ],
      }),
    ],
  });

const renderPanel = (board: OutfitBoard) => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(
    <>
      <PostAsLookPanel board={board} />
      <Toaster />
    </>,
    { wrapper: Wrapper },
  );
};

beforeEach(() => {
  mockAuth({ isCreator: true });
  vi.mocked(usePendingPhotos).mockReturnValue({
    photos: [STAGED_PHOTO],
    activePhoto: STAGED_PHOTO,
    hasUnresolvedCrop: false,
    setActiveId: vi.fn(),
    inputRef: { current: null },
    handleFileSelect: vi.fn(),
    importFile: vi.fn(),
    isImportingFile: false,
    importError: null,
    removePhoto: vi.fn(),
    updateActivePhoto: vi.fn(),
    reset: vi.fn(),
  });
  resolvePendingPhotoAssets.mockResolvedValue({
    urls: ["https://cdn.outfiqe.test/look.jpg"],
    imageAssetIds: [null],
  });
});

describe("PostAsLookPanel", () => {
  it("posts a locked build with the photos, caption and a size for each item", async () => {
    const postedBodies: unknown[] = [];
    let hasPosted = false;
    mswServer.use(
      http.get(MY_LOOK_URL, () =>
        ok(
          hasPosted
            ? { lookId: "look-1", publishedVersion: 4, lastLockedVersion: 4, isOutdated: false }
            : null,
        ),
      ),
      http.post(MY_LOOK_URL, async ({ request }) => {
        postedBodies.push(await request.json());
        hasPosted = true;
        return ok({ id: "look-1" }, 201);
      }),
    );
    renderPanel(lockedBoard());
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Drop as a look" }));
    const modal = await screen.findByRole("dialog", { name: "Drop this build as a look" });
    expect(within(modal).getByLabelText("Caption")).toHaveValue("Dashain look");
    await user.selectOptions(within(modal).getByLabelText("Size of Maroon Kurta"), "M");
    await user.click(within(modal).getByRole("button", { name: "Drop look" }));

    await waitFor(() =>
      expect(postedBodies).toEqual([
        {
          imageUrls: ["https://cdn.outfiqe.test/look.jpg"],
          imageAssetIds: [null],
          caption: "Dashain look",
          sizesWorn: [{ productId: "product-kurta", sizeWorn: "M" }],
        },
      ]),
    );
    expect(await screen.findByRole("link", { name: "View look" })).toHaveAttribute(
      "href",
      "/creator/sita?look=look-1",
    );
  });

  it("offers to drop the new version when the build was locked again", async () => {
    mswServer.use(
      http.get(MY_LOOK_URL, () =>
        ok({ lookId: "look-1", publishedVersion: 2, lastLockedVersion: 4, isOutdated: true }),
      ),
    );
    renderPanel(lockedBoard());

    expect(
      await screen.findByText("This build has a newer locked version than the look you dropped."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drop the new version" })).toBeInTheDocument();
  });

  it("stays hidden for people who aren't creators and for builds that aren't locked", () => {
    mockAuth({ isCreator: false });
    const { unmount } = renderPanel(lockedBoard());
    expect(screen.queryByRole("heading", { name: "Drop as a look" })).not.toBeInTheDocument();
    unmount();

    mockAuth({ isCreator: true });
    renderPanel({ ...lockedBoard(), status: "DRAFT" });
    expect(screen.queryByRole("heading", { name: "Drop as a look" })).not.toBeInTheDocument();
  });
});
