import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SizeStandardEditor } from "./SizeStandardEditor";

const createMutate = vi.fn();
const updateMutate = vi.fn();

vi.mock("../hooks/useSizeStandards", () => ({
  useCreateSizeStandard: () => ({ mutateAsync: createMutate, isPending: false, error: null }),
  useUpdateSizeStandard: () => ({ mutateAsync: updateMutate, isPending: false, error: null }),
}));

const savedStandard = { id: "standard-1", name: "Tops – letter", labels: [] };

beforeEach(() => {
  createMutate.mockReset().mockResolvedValue(savedStandard);
  updateMutate.mockReset().mockResolvedValue(savedStandard);
});

const labelsInOrder = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((listItem) => listItem.querySelector("span")?.textContent);

describe("SizeStandardEditor", () => {
  it("starts from a template and keeps a name the brand typed", async () => {
    render(<SizeStandardEditor onSaved={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Name"), "Kurtas");
    await userEvent.click(screen.getByRole("button", { name: "Letter sizes" }));

    expect(labelsInOrder()).toEqual(["XS", "S", "M", "L", "XL", "XXL"]);
    expect(screen.getByLabelText("Name")).toHaveValue("Kurtas");
  });

  it("adds sizes with Enter, refuses a duplicate, and reorders and removes them", async () => {
    render(<SizeStandardEditor onSaved={vi.fn()} onCancel={vi.fn()} />);
    const newSizeInput = screen.getByLabelText("New size");

    await userEvent.type(newSizeInput, "S{Enter}");
    await userEvent.type(newSizeInput, "M{Enter}");
    await userEvent.type(newSizeInput, "m{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("m is already in this size standard");

    await userEvent.click(screen.getByRole("button", { name: "Move M up" }));
    expect(labelsInOrder()).toEqual(["M", "S"]);

    await userEvent.click(screen.getByRole("button", { name: "Remove M" }));
    expect(labelsInOrder()).toEqual(["S"]);
  });

  it("creates the standard and hands it back", async () => {
    const onSaved = vi.fn();
    render(<SizeStandardEditor onSaved={onSaved} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Name"), "Waist");
    await userEvent.type(screen.getByLabelText("New size"), "30{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Create size standard" }));

    expect(createMutate).toHaveBeenCalledWith({ name: "Waist", labels: ["30"] });
    expect(onSaved).toHaveBeenCalledWith(savedStandard);
  });

  it("explains what's missing instead of saving an empty standard", async () => {
    render(<SizeStandardEditor onSaved={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Name"), "Empty");
    await userEvent.click(screen.getByRole("button", { name: "Create size standard" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Add at least one size");
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("refuses an empty size", async () => {
    render(<SizeStandardEditor onSaved={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Add size" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Type a size");
  });

  it("edits an existing standard without offering templates", async () => {
    render(
      <SizeStandardEditor
        standard={{ id: "standard-1", name: "Letter", labels: [{ id: "label-m", label: "M" }] }}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Letter sizes" })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("New size"), "L{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Save size standard" }));

    expect(updateMutate).toHaveBeenCalledWith({
      standardId: "standard-1",
      input: { name: "Letter", labels: ["M", "L"] },
    });
  });

  it("stays open when saving fails", async () => {
    createMutate.mockRejectedValue(new Error("Network down"));
    const onSaved = vi.fn();
    render(<SizeStandardEditor onSaved={onSaved} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Name"), "Waist");
    await userEvent.type(screen.getByLabelText("New size"), "30{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Create size standard" }));

    expect(onSaved).not.toHaveBeenCalled();
  });
});
