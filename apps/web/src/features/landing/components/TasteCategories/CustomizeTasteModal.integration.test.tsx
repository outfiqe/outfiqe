import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PublicCategory } from "@/features/categories/api/categorySchemas";

import { CustomizeTasteModal } from "./CustomizeTasteModal";

const NAME_BY_SLUG: Record<string, string> = {
  "old-money": "Old Money",
  streetwear: "Streetwear",
  formal: "Formal",
  y2k: "Y2K",
  sports: "Sports",
};

const category = (slug: string): PublicCategory => ({
  id: slug,
  slug,
  name: NAME_BY_SLUG[slug] ?? slug,
  imageUrl: null,
  productCount: 0,
});

const allCategories = ["old-money", "streetwear", "formal", "y2k", "sports"].map(category);

const renderModal = (overrides: Partial<Parameters<typeof CustomizeTasteModal>[0]> = {}) => {
  const onSave = vi.fn();
  const onReset = vi.fn();
  const onClose = vi.fn();
  render(
    <CustomizeTasteModal
      allCategories={allCategories}
      selectedSlugs={["old-money", "streetwear", "formal"]}
      onSave={onSave}
      onReset={onReset}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onSave, onReset, onClose };
};

describe("CustomizeTasteModal", () => {
  it("saves the current selection and order", async () => {
    const user = userEvent.setup();
    const { onSave, onClose } = renderModal();

    await user.click(screen.getByRole("button", { name: "Move Streetwear up" }));
    await user.click(screen.getByRole("button", { name: "Remove Formal" }));
    await user.click(screen.getByRole("button", { name: "Add Y2K" }));

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(["streetwear", "old-money", "y2k"]);
    expect(onClose).toHaveBeenCalled();
  });

  it("disables Save with an empty selection", async () => {
    const user = userEvent.setup();
    renderModal({ selectedSlugs: ["old-money"] });

    await user.click(screen.getByRole("button", { name: "Remove Old Money" }));

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("resets to the admin default", async () => {
    const user = userEvent.setup();
    const { onReset, onClose } = renderModal();

    await user.click(screen.getByRole("button", { name: "Reset to default" }));

    expect(onReset).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
