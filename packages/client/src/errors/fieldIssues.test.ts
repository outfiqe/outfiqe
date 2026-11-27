import { describe, expect, it } from "vitest";

import { extractFieldIssueMessages } from "./fieldIssues";

describe("extractFieldIssueMessages", () => {
  it("maps each field path to its first issue message", () => {
    const details = [
      { path: ["walletId"], message: "Phone must be 10 digits starting with 98" },
      { path: ["walletId"], message: "second" },
      { path: ["lines", 0, "qty"], message: "Too small" },
    ];
    expect(extractFieldIssueMessages(details)).toEqual({
      walletId: "Phone must be 10 digits starting with 98",
      "lines.0.qty": "Too small",
    });
  });

  it("ignores malformed or non-array details", () => {
    expect(extractFieldIssueMessages(undefined)).toEqual({});
    expect(extractFieldIssueMessages("boom")).toEqual({});
    expect(extractFieldIssueMessages([{ path: [], message: "x" }, null, { message: "y" }])).toEqual(
      {},
    );
  });
});
