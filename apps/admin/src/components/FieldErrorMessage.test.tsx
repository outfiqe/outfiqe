import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldErrorMessage } from "./FieldErrorMessage";

describe("FieldErrorMessage", () => {
  it("announces the message as an alert", () => {
    render(<FieldErrorMessage message="Enter a name." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a name.");
  });

  it("renders nothing without a message", () => {
    const { container } = render(<FieldErrorMessage message={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });
});
