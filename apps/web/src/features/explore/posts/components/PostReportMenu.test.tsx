import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PostReportMenu } from "./PostReportMenu";

describe("PostReportMenu", () => {
  it("hides the report option until the trigger is opened", () => {
    render(<PostReportMenu onReport={vi.fn()} />);

    expect(screen.queryByRole("menuitem", { name: "Report" })).not.toBeInTheDocument();
  });

  it("calls onReport and closes the menu when Report is clicked", async () => {
    const user = userEvent.setup();
    const onReport = vi.fn();
    render(<PostReportMenu onReport={onReport} />);

    await user.click(screen.getByRole("button", { name: "Drop options" }));
    await user.click(screen.getByRole("menuitem", { name: "Report" }));

    expect(onReport).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menuitem", { name: "Report" })).not.toBeInTheDocument();
  });

  it("doesn't offer Report a tag when the drop has no tags", async () => {
    const user = userEvent.setup();
    render(<PostReportMenu onReport={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Drop options" }));

    expect(screen.queryByRole("menuitem", { name: "Report a tag" })).not.toBeInTheDocument();
  });

  it("calls onReportTag and closes the menu when Report a tag is clicked", async () => {
    const user = userEvent.setup();
    const onReport = vi.fn();
    const onReportTag = vi.fn();
    render(<PostReportMenu onReport={onReport} onReportTag={onReportTag} />);

    await user.click(screen.getByRole("button", { name: "Drop options" }));
    await user.click(screen.getByRole("menuitem", { name: "Report a tag" }));

    expect(onReportTag).toHaveBeenCalledTimes(1);
    expect(onReport).not.toHaveBeenCalled();
    expect(screen.queryByRole("menuitem", { name: "Report a tag" })).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <PostReportMenu onReport={vi.fn()} />
        <button type="button">outside</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Drop options" }));
    expect(screen.getByRole("menuitem", { name: "Report" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("menuitem", { name: "Report" })).not.toBeInTheDocument();
  });
});
