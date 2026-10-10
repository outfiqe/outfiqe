import { onlineManager } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OfflineBanner } from "./OfflineBanner";

afterEach(() => {
  onlineManager.setOnline(true);
});

describe("OfflineBanner", () => {
  it("stays out of the way while there is a connection", () => {
    onlineManager.setOnline(true);

    render(<OfflineBanner />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("explains that content may be out of date once the connection drops", async () => {
    render(<OfflineBanner />);

    onlineManager.setOnline(false);

    expect(await screen.findByText(/showing saved content/i)).toBeInTheDocument();
  });

  it("disappears again once the connection returns", async () => {
    render(<OfflineBanner />);
    onlineManager.setOnline(false);
    await screen.findByText(/showing saved content/i);

    onlineManager.setOnline(true);

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });
});
