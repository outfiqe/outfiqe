import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContinueWithOAuthButtons } from "./ContinueWithOAuthButtons";

describe("ContinueWithOAuthButtons", () => {
  it("links each provider to its start endpoint with the given redirect target", () => {
    render(<ContinueWithOAuthButtons redirectAfter="/checkout" />);

    const google = screen.getByRole("link", { name: "Google" });
    const facebook = screen.getByRole("link", { name: "Facebook" });

    expect(google).toHaveAttribute("href", "/api/auth/oauth/google/start?redirect=%2Fcheckout");
    expect(facebook).toHaveAttribute("href", "/api/auth/oauth/facebook/start?redirect=%2Fcheckout");
  });
});
