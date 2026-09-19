import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RedirectingToLogin } from "./RedirectingToLogin";

describe("RedirectingToLogin", () => {
  it("tells the person they are being redirected to login, as a status message", () => {
    render(<RedirectingToLogin />);

    expect(screen.getByRole("status")).toHaveTextContent("Redirecting to login…");
  });
});
