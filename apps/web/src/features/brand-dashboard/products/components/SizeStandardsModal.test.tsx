import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SizeStandard } from "../api/sizeStandardSchemas";
import { SizeStandardsModal } from "./SizeStandardsModal";

const archiveMutate = vi.fn();
const updateMutate = vi.fn();
const refetch = vi.fn();

type StandardsQuery = {
  data: SizeStandard[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: typeof refetch;
};

let standardsQuery: StandardsQuery;

vi.mock("../hooks/useSizeStandards", () => ({
  useSizeStandards: () => standardsQuery,
  useArchiveSizeStandard: () => ({ mutate: archiveMutate, isPending: false }),
  useCreateSizeStandard: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useUpdateSizeStandard: () => ({ mutateAsync: updateMutate, isPending: false, error: null }),
}));

const letterStandard: SizeStandard = {
  id: "standard-1",
  name: "Letter sizes",
  labels: [
    { id: "label-s", label: "S" },
    { id: "label-m", label: "M" },
  ],
};

beforeEach(() => {
  archiveMutate.mockReset();
  refetch.mockReset();
  standardsQuery = {
    data: [letterStandard],
    isPending: false,
    isError: false,
    error: null,
    refetch,
  };
});

describe("SizeStandardsModal", () => {
  it("lists each standard with its sizes", () => {
    render(<SizeStandardsModal open onClose={vi.fn()} />);

    expect(screen.getByText("Letter sizes")).toBeInTheDocument();
    expect(screen.getByText("S · M")).toBeInTheDocument();
  });

  it("archives a standard", async () => {
    render(<SizeStandardsModal open onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Archive Letter sizes" }));

    expect(archiveMutate).toHaveBeenCalledWith("standard-1", expect.any(Object));
  });

  it("opens the editor for a standard and for a new one", async () => {
    render(<SizeStandardsModal open onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit Letter sizes" }));
    expect(screen.getByLabelText("Name")).toHaveValue("Letter sizes");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "New size standard" }));
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("goes back to the list once an edited standard is saved", async () => {
    updateMutate.mockResolvedValue(letterStandard);
    render(<SizeStandardsModal open onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit Letter sizes" }));
    await userEvent.click(screen.getByRole("button", { name: "Save size standard" }));

    expect(updateMutate).toHaveBeenCalledWith({
      standardId: "standard-1",
      input: { name: "Letter sizes", labels: ["S", "M"] },
    });
    expect(await screen.findByRole("button", { name: "Edit Letter sizes" })).toBeInTheDocument();
  });

  it("explains that there are no standards yet", () => {
    standardsQuery = { ...standardsQuery, data: [] };
    render(<SizeStandardsModal open onClose={vi.fn()} />);

    expect(
      screen.getByText("No size standards yet. Create one to start adding products."),
    ).toBeInTheDocument();
  });

  it("offers a retry when the standards can't load", async () => {
    standardsQuery = {
      ...standardsQuery,
      data: undefined,
      isError: true,
      error: new Error("Network down"),
    };
    render(<SizeStandardsModal open onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });
});
