import { beforeEach, describe, expect, it } from "vitest";

import {
  DAYS_BEFORE_ASKING_TO_INSTALL_AGAIN,
  hasVisitedOftenEnough,
  isWithinInstallPromptCooldown,
  recordAppVisit,
  rememberInstallPromptDismissed,
  VISITS_BEFORE_SUGGESTING_INSTALL,
} from "./installPrompt";

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

beforeEach(() => {
  window.localStorage.clear();
});

describe("recordAppVisit / hasVisitedOftenEnough", () => {
  it("has not visited often enough on a fresh visitor", () => {
    expect(hasVisitedOftenEnough()).toBe(false);
  });

  it("counts up with every recorded visit", () => {
    expect(recordAppVisit()).toBe(1);
    expect(recordAppVisit()).toBe(2);
    expect(recordAppVisit()).toBe(3);
  });

  it("crosses the threshold once enough visits are recorded", () => {
    for (let visit = 0; visit < VISITS_BEFORE_SUGGESTING_INSTALL - 1; visit += 1) {
      recordAppVisit();
    }
    expect(hasVisitedOftenEnough()).toBe(false);

    recordAppVisit();
    expect(hasVisitedOftenEnough()).toBe(true);
  });
});

describe("rememberInstallPromptDismissed / isWithinInstallPromptCooldown", () => {
  it("is not in cooldown before anyone dismisses the prompt", () => {
    expect(isWithinInstallPromptCooldown()).toBe(false);
  });

  it("enters cooldown the moment the prompt is dismissed", () => {
    const dismissedAt = new Date("2026-01-01T00:00:00.000Z");
    rememberInstallPromptDismissed(dismissedAt);

    expect(isWithinInstallPromptCooldown(dismissedAt)).toBe(true);
  });

  it("stays in cooldown right up to the last moment of the window", () => {
    const dismissedAt = new Date("2026-01-01T00:00:00.000Z");
    rememberInstallPromptDismissed(dismissedAt);
    const justBeforeCooldownEnds = new Date(
      dismissedAt.getTime() + DAYS_BEFORE_ASKING_TO_INSTALL_AGAIN * MILLISECONDS_PER_DAY - 1,
    );

    expect(isWithinInstallPromptCooldown(justBeforeCooldownEnds)).toBe(true);
  });

  it("leaves cooldown once the window has fully elapsed", () => {
    const dismissedAt = new Date("2026-01-01T00:00:00.000Z");
    rememberInstallPromptDismissed(dismissedAt);
    const afterCooldownEnds = new Date(
      dismissedAt.getTime() + DAYS_BEFORE_ASKING_TO_INSTALL_AGAIN * MILLISECONDS_PER_DAY,
    );

    expect(isWithinInstallPromptCooldown(afterCooldownEnds)).toBe(false);
  });
});
