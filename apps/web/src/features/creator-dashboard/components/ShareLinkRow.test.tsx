import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShareLinkRow } from "./ShareLinkRow";

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

describe("ShareLinkRow", () => {
  it("renders the label and url", () => {
    render(<ShareLinkRow label="Profile link" url="https://outfiqe.test/r/abc" />);

    expect(screen.getByText("Profile link")).toBeInTheDocument();
    expect(screen.getByText("https://outfiqe.test/r/abc")).toBeInTheDocument();
  });

  it("renders optional meta text when given", () => {
    render(
      <ShareLinkRow
        label="Your link"
        url="https://outfiqe.test/r/abc"
        meta="reusable link · 3 clicks"
      />,
    );

    expect(screen.getByText("reusable link · 3 clicks")).toBeInTheDocument();
  });

  it("omits meta text when not given", () => {
    render(<ShareLinkRow label="Your link" url="https://outfiqe.test/r/abc" />);

    expect(screen.queryByText(/clicks/)).not.toBeInTheDocument();
  });

  it("copies the url to the clipboard when Copy is clicked", async () => {
    const user = userEvent.setup();
    render(<ShareLinkRow label="Profile link" url="https://outfiqe.test/r/abc" />);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await user.click(screen.getByRole("button", { name: /Copy/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://outfiqe.test/r/abc"));
  });
});
