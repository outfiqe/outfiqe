import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CreatorProfilePageSkeleton } from "@/features/creator-profile/components/CreatorProfilePageSkeleton";

describe("CreatorProfilePageSkeleton", () => {
  it("renders an accessible loading status for the whole profile page", () => {
    render(<CreatorProfilePageSkeleton />);

    expect(screen.getByRole("status", { name: "Loading profile" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading posts" })).toBeInTheDocument();
  });
});
