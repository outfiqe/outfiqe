import { afterEach, describe, expect, it } from "vitest";

import { isPwaKillSwitchEngagedOnClient, PWA_KILL_SWITCH_ATTRIBUTE } from "./pwaKillSwitch";

afterEach(() => {
  document.documentElement.removeAttribute(PWA_KILL_SWITCH_ATTRIBUTE);
});

describe("isPwaKillSwitchEngagedOnClient", () => {
  it("is engaged once the server has marked the page as killed", () => {
    document.documentElement.setAttribute(PWA_KILL_SWITCH_ATTRIBUTE, "true");

    expect(isPwaKillSwitchEngagedOnClient()).toBe(true);
  });

  it("is not engaged when the page carries no kill-switch attribute", () => {
    expect(isPwaKillSwitchEngagedOnClient()).toBe(false);
  });
});
