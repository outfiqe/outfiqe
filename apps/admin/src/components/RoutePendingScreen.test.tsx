import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RoutePendingScreen } from "./RoutePendingScreen";

describe("RoutePendingScreen", () => {
  it("announces a loading status to assistive technology", () => {
    render(<RoutePendingScreen />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading page");
  });
});
