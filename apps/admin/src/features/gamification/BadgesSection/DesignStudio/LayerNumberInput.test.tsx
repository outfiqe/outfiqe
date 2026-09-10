import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LayerNumberInput } from "./LayerNumberInput";

const setup = (value = 4) => {
  const onCommit = vi.fn();
  render(<LayerNumberInput id="w" value={value} min={1} max={8} onCommit={onCommit} />);
  return { onCommit, field: screen.getByRole("spinbutton") as HTMLInputElement };
};

describe("LayerNumberInput", () => {
  it("lets the field be cleared without committing a value", async () => {
    const user = userEvent.setup();
    const { onCommit, field } = setup(4);

    await user.clear(field);

    expect(field.value).toBe("");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("commits the typed number once it is valid again", async () => {
    const user = userEvent.setup();
    const { onCommit, field } = setup(4);

    await user.clear(field);
    await user.type(field, "6");

    expect(onCommit).toHaveBeenLastCalledWith(6);
  });

  it("clamps a typed value to the allowed range", async () => {
    const user = userEvent.setup();
    const { onCommit, field } = setup(4);

    await user.clear(field);
    await user.type(field, "50");

    expect(onCommit).toHaveBeenLastCalledWith(8);
  });

  it("restores the committed value on blur when left empty", async () => {
    const user = userEvent.setup();
    const { field } = setup(4);

    await user.clear(field);
    await user.tab();

    expect(field.value).toBe("4");
  });
});
