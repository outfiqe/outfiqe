import { render, screen } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import { AccountSuspendedScreen } from "./AccountSuspendedScreen";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

const mockParams = (params: Record<string, string>) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(params) as ReturnType<typeof useSearchParams>,
  );
};

describe("AccountSuspendedScreen", () => {
  it("shows the reason and a formatted expiry date for a temporary suspension", () => {
    mockParams({ reason: "Reported for spam", expiresAt: "2026-09-20T00:00:00.000Z" });

    render(<AccountSuspendedScreen />);

    expect(screen.getByText("Reported for spam")).toBeInTheDocument();
    expect(screen.getByText(/lifts automatically on September 20, 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/contact");
  });

  it("says the suspension has no end date when there's no expiry", () => {
    mockParams({ reason: "Severe policy violation" });

    render(<AccountSuspendedScreen />);

    expect(screen.getByText(/has no set end date/i)).toBeInTheDocument();
  });
});
