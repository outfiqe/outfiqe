import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BadgeIconUploader } from "./BadgeIconUploader";

describe("BadgeIconUploader", () => {
  it("prompts to upload an image when there is no value", () => {
    render(<BadgeIconUploader value="" onChange={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Upload image" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("shows a change/remove pair once an image is set and clears on Remove", async () => {
    const onClear = vi.fn();
    render(
      <BadgeIconUploader value="https://cdn.test/i.png" onChange={vi.fn()} onClear={onClear} />,
    );

    expect(screen.getByRole("button", { name: "Change image" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("accepts svg alongside png and jpeg on the file input", () => {
    const { container } = render(
      <BadgeIconUploader value="" onChange={vi.fn()} onClear={vi.fn()} />,
    );
    const input = container.querySelector('input[type="file"]');
    expect(input?.getAttribute("accept")).toContain("image/svg+xml");
  });
});
