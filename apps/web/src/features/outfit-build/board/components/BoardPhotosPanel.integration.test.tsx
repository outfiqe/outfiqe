import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { OutfitBoard, OutfitPhoto } from "../../api/outfitSchemas";
import { buildBoard, RAM, SITA } from "../../testing/outfitFixtures";
import { BoardPhotosPanel } from "./BoardPhotosPanel";

const photo = (overrides: Partial<OutfitPhoto> = {}): OutfitPhoto => ({
  id: "photo-1",
  kind: "COVER",
  status: "READY",
  image: { url: "https://cdn.outfiqe.test/photo-1.jpg", lqip: null, sources: [] },
  uploadedBy: SITA,
  coverPosition: null,
  createdAt: "2026-10-04T10:00:00.000Z",
  ...overrides,
});

const firstOf = (elements: HTMLElement[]): HTMLElement => {
  const [firstElement] = elements;
  if (!firstElement) throw new Error("Expected at least one element");
  return firstElement;
};

const renderPanel = (board: OutfitBoard, { currentUserId = SITA.id, isTryOnOn = false } = {}) => {
  const callbacks = {
    onAddPhotos: vi.fn().mockResolvedValue(true),
    onRemovePhoto: vi.fn(),
    onSetCovers: vi.fn(),
  };
  const { Wrapper } = createTranslatedQueryWrapper();
  render(
    <BoardPhotosPanel
      board={board}
      currentUserId={currentUserId}
      isTryOnOn={isTryOnOn}
      {...callbacks}
    />,
    { wrapper: Wrapper },
  );
  return callbacks;
};

describe("BoardPhotosPanel", () => {
  it("shows an empty gallery with an add button for a member", () => {
    renderPanel(buildBoard());

    expect(screen.getByText("No photos yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add photos" })).toBeEnabled();
  });

  it("lets the owner pick covers in order and unpick one", async () => {
    const user = userEvent.setup();
    const callbacks = renderPanel(
      buildBoard({
        photos: [
          photo({ id: "photo-1", coverPosition: 0 }),
          photo({ id: "photo-2", uploadedBy: RAM }),
        ],
      }),
    );

    await user.click(firstOf(screen.getAllByRole("button", { name: "Use as a cover photo" })));
    expect(callbacks.onSetCovers).toHaveBeenLastCalledWith(["photo-1", "photo-2"]);

    await user.click(screen.getByRole("button", { name: "Stop using as a cover photo" }));
    expect(callbacks.onSetCovers).toHaveBeenLastCalledWith([]);
  });

  it("won't pick more covers than the limit allows", async () => {
    const user = userEvent.setup();
    const board = buildBoard({
      photos: [photo({ id: "photo-1", coverPosition: 0 }), photo({ id: "photo-2" })],
    });
    const callbacks = renderPanel({ ...board, limits: { ...board.limits, maxCoverPhotos: 1 } });

    await user.click(screen.getByRole("button", { name: "Use as a cover photo" }));

    expect(callbacks.onSetCovers).not.toHaveBeenCalled();
  });

  it("lets an editor remove only their own photos and never pick covers", async () => {
    const user = userEvent.setup();
    const callbacks = renderPanel(
      buildBoard({
        myRole: "EDITOR",
        photos: [photo({ id: "sitas-photo" }), photo({ id: "rams-photo", uploadedBy: RAM })],
      }),
      { currentUserId: RAM.id },
    );

    const removeButtons = screen.getAllByRole("button", { name: "Remove photo" });
    expect(removeButtons).toHaveLength(1);
    await user.click(firstOf(removeButtons));
    expect(callbacks.onRemovePhoto).toHaveBeenCalledWith("rams-photo");
    expect(screen.queryByRole("button", { name: "Use as a cover photo" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Add photos of the outfit. The owner picks the cover."),
    ).toBeInTheDocument();
  });

  it("stops adding once the person has used up their photos", () => {
    const board = buildBoard({ photos: [photo()] });
    renderPanel({ ...board, limits: { ...board.limits, maxPhotosPerMember: 1 } });

    expect(screen.getByRole("button", { name: "Photo limit reached" })).toBeDisabled();
  });

  it("keeps try-on photos in their own gallery, never as covers", () => {
    const board = buildBoard({ photos: [photo({ id: "try-on-1", kind: "TRY_ON" })] });
    renderPanel(board, { isTryOnOn: true });

    expect(screen.getByRole("heading", { name: "Try-on photos" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Photo added by Sita Rai" })).toBeInTheDocument();
    expect(screen.getByText("No photos yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use as a cover photo" })).not.toBeInTheDocument();
  });

  it("hides the try-on gallery while try-on photos are switched off", () => {
    renderPanel(buildBoard({ photos: [photo({ id: "try-on-1", kind: "TRY_ON" })] }));

    expect(screen.queryByRole("heading", { name: "Try-on photos" })).not.toBeInTheDocument();
  });

  it("hides adding and removing on an archived build", () => {
    renderPanel(buildBoard({ status: "ARCHIVED", photos: [photo()] }));

    expect(screen.queryByRole("button", { name: "Add photos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove photo" })).not.toBeInTheDocument();
  });
});
