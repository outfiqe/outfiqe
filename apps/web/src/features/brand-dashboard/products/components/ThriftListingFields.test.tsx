import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ThriftListingFields } from "./ThriftListingFields";

const baseProps = {
  isThrift: false,
  onIsThriftChange: vi.fn(),
  conditionRating: undefined,
  onConditionRatingChange: vi.fn(),
  conditionNotes: "",
  onConditionNotesChange: vi.fn(),
};

describe("ThriftListingFields", () => {
  it("hides the condition fields when isThrift is off", () => {
    render(<ThriftListingFields {...baseProps} />);

    expect(screen.queryByText("Condition")).not.toBeInTheDocument();
    expect(screen.queryByText("Condition notes")).not.toBeInTheDocument();
  });

  it("shows the condition fields once isThrift is on", () => {
    render(<ThriftListingFields {...baseProps} isThrift />);

    expect(screen.getByText("Condition")).toBeInTheDocument();
    expect(screen.getByText("Condition notes")).toBeInTheDocument();
  });

  it("calls onIsThriftChange when the checkbox is toggled", async () => {
    const onIsThriftChange = vi.fn();
    const user = userEvent.setup();
    render(<ThriftListingFields {...baseProps} onIsThriftChange={onIsThriftChange} />);

    await user.click(screen.getByRole("checkbox"));

    expect(onIsThriftChange).toHaveBeenCalledWith(true);
  });

  it("reports the condition rating and notes back to the caller", async () => {
    const onConditionRatingChange = vi.fn();
    const onConditionNotesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ThriftListingFields
        {...baseProps}
        isThrift
        onConditionRatingChange={onConditionRatingChange}
        onConditionNotesChange={onConditionNotesChange}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "Good");
    expect(onConditionRatingChange).toHaveBeenCalledWith("GOOD");

    await user.type(screen.getByPlaceholderText(/small mark/i), "x");
    expect(onConditionNotesChange).toHaveBeenCalledWith("x");
  });

  it("shows the condition error message when given one", () => {
    render(
      <ThriftListingFields
        {...baseProps}
        isThrift
        conditionError="Add a condition rating and a short condition note for a thrift listing."
      />,
    );

    expect(
      screen.getByText("Add a condition rating and a short condition note for a thrift listing."),
    ).toBeInTheDocument();
  });
});
