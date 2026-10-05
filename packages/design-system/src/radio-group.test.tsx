import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RadioGroup } from "./radio-group";

const OPTIONS = [
  { value: "PRIVATE" as const, label: "Private", description: "Only the people building it." },
  { value: "PUBLIC" as const, label: "Public" },
];

describe("RadioGroup", () => {
  it("groups the choices under an accessible name and marks the chosen one", () => {
    render(
      <RadioGroup legend="Who can see it" options={OPTIONS} value="PRIVATE" onChange={vi.fn()} />,
    );

    expect(screen.getByRole("group", { name: "Who can see it" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Private/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Public/ })).not.toBeChecked();
    expect(screen.getByText("Only the people building it.")).toBeInTheDocument();
  });

  it("reports a new choice", () => {
    const onChange = vi.fn();
    render(
      <RadioGroup legend="Who can see it" options={OPTIONS} value="PRIVATE" onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /Public/ }));

    expect(onChange).toHaveBeenCalledWith("PUBLIC");
  });

  it("can be switched off as a whole", () => {
    render(
      <RadioGroup
        legend="Who can see it"
        options={OPTIONS}
        value={null}
        onChange={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByRole("radio", { name: /Public/ })).toBeDisabled();
  });
});
