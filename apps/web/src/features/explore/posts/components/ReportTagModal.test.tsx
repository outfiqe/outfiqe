import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { FeedTaggedProduct } from "../../feed/api/exploreFeedSchemas";
import { ReportTagModal } from "./ReportTagModal";

const joggers: FeedTaggedProduct = {
  id: "product-joggers",
  name: "Satin jogger trousers",
  brand: "Linen Studio",
  price: 3200,
  imageUrl: null,
  sizeWorn: "M",
};

const trousers: FeedTaggedProduct = {
  id: "product-trousers",
  name: "Houndstooth trousers",
  brand: "Linen Studio",
  price: 1900,
  imageUrl: null,
  sizeWorn: "M",
};

const renderModal = (onConfirm = vi.fn(), onCancel = vi.fn()) => {
  render(
    <ReportTagModal
      taggedProducts={[joggers, trousers]}
      isPending={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel };
};

describe("ReportTagModal", () => {
  it("lists every tagged product with the first one picked", () => {
    renderModal();

    expect(screen.getByRole("radio", { name: /Satin jogger trousers/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Houndstooth trousers/ })).not.toBeChecked();
  });

  it("sends the chosen tag, reason and note", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();

    await user.click(screen.getByRole("radio", { name: /Houndstooth trousers/ }));
    await user.click(screen.getByRole("radio", { name: "They're not really wearing it" }));
    await user.type(screen.getByLabelText("Add a note (optional)"), "  Only in the caption  ");
    await user.click(screen.getByRole("button", { name: "Report" }));

    expect(onConfirm).toHaveBeenCalledWith({
      productId: "product-trousers",
      reason: "NOT_GENUINELY_WORN",
      note: "Only in the caption",
    });
  });

  it("leaves the note out when it's empty", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();

    await user.click(screen.getByRole("button", { name: "Report" }));

    expect(onConfirm).toHaveBeenCalledWith({
      productId: "product-joggers",
      reason: "COUNTERFEIT",
      note: undefined,
    });
  });

  it("needs a note before reporting Something else", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("radio", { name: "Something else" }));

    expect(screen.getByLabelText("Tell us more")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Report" })).toBeDisabled();

    await user.type(screen.getByLabelText("Tell us more"), "The tag points to a jacket");

    expect(screen.getByRole("button", { name: "Report" })).toBeEnabled();
  });

  it("calls onCancel when Cancel is chosen", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderModal();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
