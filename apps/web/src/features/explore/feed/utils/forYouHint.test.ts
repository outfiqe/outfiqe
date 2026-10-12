import { beforeEach, describe, expect, it } from "vitest";

import { isForYouHintDismissed, rememberForYouHintDismissed } from "./forYouHint";

beforeEach(() => {
  window.localStorage.clear();
});

describe("isForYouHintDismissed / rememberForYouHintDismissed", () => {
  it("is not dismissed for a fresh visitor", () => {
    expect(isForYouHintDismissed()).toBe(false);
  });

  it("stays dismissed once remembered", () => {
    rememberForYouHintDismissed();

    expect(isForYouHintDismissed()).toBe(true);
  });
});
