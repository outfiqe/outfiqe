import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductsLoadError } from "./ProductsLoadError";

describe("ProductsLoadError", () => {
  it("tells the shopper the load failed and retries when asked", async () => {
    const user = userEvent.setup();
    const retryLoading = vi.fn();
    render(<ProductsLoadError onRetry={retryLoading} />);

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load these pieces.");

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(retryLoading).toHaveBeenCalledOnce();
  });
});
