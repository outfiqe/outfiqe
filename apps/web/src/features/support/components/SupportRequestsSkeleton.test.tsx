import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SupportRequestsSkeleton } from "./SupportRequestsSkeleton";

describe("SupportRequestsSkeleton", () => {
  it("announces itself as a loading status for assistive tech", () => {
    render(<SupportRequestsSkeleton />);

    expect(screen.getByRole("status", { name: "Loading your support requests" })).toBeDefined();
  });

  it("renders three placeholder rows", () => {
    render(<SupportRequestsSkeleton />);

    expect(screen.getByRole("status").children).toHaveLength(3);
  });
});
