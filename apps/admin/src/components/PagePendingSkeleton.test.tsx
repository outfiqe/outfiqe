import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PagePendingSkeleton } from "./PagePendingSkeleton";

describe("PagePendingSkeleton", () => {
  it("announces a loading status to assistive technology", () => {
    render(<PagePendingSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading page");
  });
});
