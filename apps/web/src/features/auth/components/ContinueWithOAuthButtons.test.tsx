import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContinueWithOAuthButtons } from "./ContinueWithOAuthButtons";

describe("ContinueWithOAuthButtons", () => {
  it("links Google to its start endpoint with the given redirect target", () => {
    render(<ContinueWithOAuthButtons redirectAfter="/checkout" />);

    const google = screen.getByRole("link", { name: "Google" });

    expect(google).toHaveAttribute("href", "/api/auth/oauth/google/start?redirect=%2Fcheckout");
  });

  it("shows Facebook as a disabled coming-soon button rather than a link", () => {
    render(<ContinueWithOAuthButtons redirectAfter="/checkout" />);

    expect(screen.queryByRole("link", { name: /facebook/i })).not.toBeInTheDocument();

    const facebook = screen.getByRole("button", {
      name: /facebook sign-in will be available soon/i,
    });

    expect(facebook).toBeDisabled();
  });
});
