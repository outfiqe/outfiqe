import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReportRowSkeleton } from "./ReportRowSkeleton";

describe("ReportRowSkeleton", () => {
  it("uses the real report row wrapper with the thumbnail, badges and Resolve button", () => {
    const { container } = render(<ReportRowSkeleton />);

    expect(container.firstElementChild).toHaveClass("flex", "gap-4", "rounded-xl", "p-4");
    expect(container.querySelector(".size-20")).not.toBeNull();
    expect(container.querySelectorAll("span.skeleton-pill")).toHaveLength(2);
    expect(container.querySelector("button.h-11")).not.toBeNull();
  });

  it("adds the leading product name bar only for tag reports", () => {
    const { container: contentReport } = render(<ReportRowSkeleton />);
    const { container: tagReport } = render(<ReportRowSkeleton hasLeadingName />);

    expect(tagReport.querySelectorAll(".h-5.w-32")).toHaveLength(
      contentReport.querySelectorAll(".h-5.w-32").length + 1,
    );
  });
});
