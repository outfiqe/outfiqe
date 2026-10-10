import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BackgroundRefreshRegistration } from "./BackgroundRefreshRegistration";

vi.mock("../utils/backgroundRefresh", () => ({
  registerBackgroundRefresh: vi.fn().mockResolvedValue(false),
}));

const { registerBackgroundRefresh } = await import("../utils/backgroundRefresh");

describe("BackgroundRefreshRegistration", () => {
  it("attempts registration once, on load", () => {
    render(<BackgroundRefreshRegistration />);

    expect(registerBackgroundRefresh).toHaveBeenCalledTimes(1);
  });

  it("renders nothing", () => {
    const { container } = render(<BackgroundRefreshRegistration />);

    expect(container).toBeEmptyDOMElement();
  });
});
