import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserRole } from "../types";
import { NotAShopperNotice } from "./NotAShopperNotice";

const authState = {
  state: { user: null as { role: UserRole } | null },
  isBrandOwner: false,
};

vi.mock("../context/AuthContext", () => ({
  useAuth: () => authState,
}));

describe("NotAShopperNotice", () => {
  it("points a brand owner at their dashboard", () => {
    authState.state.user = { role: UserRole.BRAND_OWNER };
    authState.isBrandOwner = true;

    render(<NotAShopperNotice />);

    expect(screen.getByText(/for customer accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/brand account manages products/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to your dashboard" })).toHaveAttribute(
      "href",
      "/overview",
    );
  });

  it("names the admin account and links to the admin app", () => {
    authState.state.user = { role: UserRole.ADMIN };
    authState.isBrandOwner = false;

    render(<NotAShopperNotice />);

    expect(screen.getByText(/admin account manages products/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to your dashboard" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });
});
