import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QrCode } from "./QrCode";
import { buildQrMatrix } from "./qrCode.utils";

const QUIET_ZONE_WIDTH = 8;

describe("buildQrMatrix", () => {
  it("adds a quiet zone around the code", () => {
    const { moduleCount } = buildQrMatrix("7K2M9QAB");

    expect(moduleCount).toBeGreaterThan(QUIET_ZONE_WIDTH);
  });

  it("draws different codes differently", () => {
    expect(buildQrMatrix("7K2M9QAB").path).not.toBe(buildQrMatrix("8L3N0RBC").path);
  });
});

describe("QrCode", () => {
  it("renders an accessible image of the code", () => {
    render(<QrCode value="7K2M9QAB" label="Pickup code 7K2M9QAB" />);

    expect(screen.getByRole("img", { name: "Pickup code 7K2M9QAB" })).toBeInTheDocument();
  });
});
