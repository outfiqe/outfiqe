import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Tooltip } from "./tooltip";

const HINT = "Revenue counts paid and cash-on-delivery orders only.";

describe("Tooltip", () => {
  it("keeps the hint hidden until the trigger is interacted with", () => {
    render(
      <Tooltip content={HINT}>
        <button type="button">How is this calculated?</button>
      </Tooltip>,
    );

    expect(screen.getByRole("button", { name: "How is this calculated?" })).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("reveals the hint when the trigger receives keyboard focus", async () => {
    render(
      <Tooltip content={HINT}>
        <button type="button">How is this calculated?</button>
      </Tooltip>,
    );

    fireEvent.focus(screen.getByRole("button", { name: "How is this calculated?" }));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(HINT);
  });

  it("hides the hint again when focus leaves the trigger", async () => {
    render(
      <Tooltip content={HINT}>
        <button type="button">How is this calculated?</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "How is this calculated?" });
    fireEvent.focus(trigger);
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
