import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ActiveXpMultiplier } from "../api/xpSchemas";
import { useActiveXpMultiplier } from "../hooks/useActiveXpMultiplier";
import { XpMultiplierBanner } from "./XpMultiplierBanner";

vi.mock("../hooks/useActiveXpMultiplier", () => ({
  useActiveXpMultiplier: vi.fn(),
}));

const mockActiveMultiplier = (data: ActiveXpMultiplier) => {
  vi.mocked(useActiveXpMultiplier).mockReturnValue({ data } as ReturnType<
    typeof useActiveXpMultiplier
  >);
};

describe("XpMultiplierBanner", () => {
  it("renders nothing when no multiplier is active", () => {
    mockActiveMultiplier(null);
    const { container } = render(<XpMultiplierBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the label and multiplier when one is active", () => {
    mockActiveMultiplier({
      label: "Founders Weekend",
      multiplier: 2,
      endsAt: "2026-08-24T00:00:00.000Z",
    });
    render(<XpMultiplierBanner />);

    expect(screen.getByText(/Founders Weekend/)).toBeInTheDocument();
    expect(screen.getByText(/2x XP/)).toBeInTheDocument();
  });
});
