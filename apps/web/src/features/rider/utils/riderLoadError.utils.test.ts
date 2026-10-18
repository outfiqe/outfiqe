import { describe, expect, it } from "vitest";

import { ApiClientError } from "@/shared/lib/apiClient";

import { describeRiderLoadError } from "./riderLoadError.utils";

const NO_SIGNAL_MESSAGE = "We couldn't load your visits. Check your signal and try again.";

describe("describeRiderLoadError", () => {
  it("shows the server's reason when the server answered", () => {
    const notActive = new ApiClientError(
      "Your rider account isn't active yet. Ask your hub lead.",
      "RIDER_NOT_ACTIVE",
    );

    expect(describeRiderLoadError(notActive, NO_SIGNAL_MESSAGE)).toBe(
      "Your rider account isn't active yet. Ask your hub lead.",
    );
  });

  it("asks the rider to check their signal when the request never got an answer", () => {
    const noAnswer = new ApiClientError("Network Error", "UNKNOWN_ERROR");

    expect(describeRiderLoadError(noAnswer, NO_SIGNAL_MESSAGE)).toBe(NO_SIGNAL_MESSAGE);
    expect(describeRiderLoadError(new TypeError("Failed to fetch"), NO_SIGNAL_MESSAGE)).toBe(
      NO_SIGNAL_MESSAGE,
    );
  });
});
