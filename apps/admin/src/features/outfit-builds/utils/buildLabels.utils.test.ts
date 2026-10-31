import { describe, expect, it } from "vitest";

import { toBuildChangeCountLabel, toBuildEventLabel } from "./buildLabels.utils";

describe("toBuildEventLabel", () => {
  it("says what happened in plain words", () => {
    expect(toBuildEventLabel("CREATED")).toBe("started the build");
    expect(toBuildEventLabel("MEMBER_HAPPY")).toBe('changed their "I\'m happy" choice');
  });

  it("still reads properly for a kind of change it doesn't know", () => {
    expect(toBuildEventLabel("SOMETHING_NEW")).toBe("changed the build");
  });
});

describe("toBuildChangeCountLabel", () => {
  it("counts changes", () => {
    expect(toBuildChangeCountLabel(0)).toBe("No changes yet");
    expect(toBuildChangeCountLabel(1)).toBe("1 change");
    expect(toBuildChangeCountLabel(1200)).toBe("1,200 changes");
  });
});
