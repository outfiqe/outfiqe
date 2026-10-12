import { afterEach, describe, expect, it, vi } from "vitest";

import {
  forgetDeviceMeasurements,
  readDeviceMeasurements,
  rememberDeviceMeasurements,
} from "./deviceMeasurements";
import { buildFitPagePath } from "./fitPagePath";
import { EMPTY_MEASUREMENT_DRAFT, toFitMeasurements, toMeasurementDraft } from "./measurementDraft";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("device measurements", () => {
  it("remembers, reads back and forgets measurements", () => {
    rememberDeviceMeasurements({ heightCm: 165, weightKg: 60 });
    expect(readDeviceMeasurements()).toEqual({ heightCm: 165, weightKg: 60 });

    forgetDeviceMeasurements();
    expect(readDeviceMeasurements()).toBeNull();
  });

  it("ignores stored values that aren't usable measurements", () => {
    window.localStorage.setItem("outfiqe.fit-measurements", JSON.stringify({ heightCm: 999 }));
    expect(readDeviceMeasurements()).toBeNull();

    window.localStorage.setItem("outfiqe.fit-measurements", "{not json");
    expect(readDeviceMeasurements()).toBeNull();
  });

  it("carries on when the browser blocks storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(readDeviceMeasurements()).toBeNull();
    expect(() => rememberDeviceMeasurements({ heightCm: 165, weightKg: 60 })).not.toThrow();
    expect(() => forgetDeviceMeasurements()).not.toThrow();
  });
});

describe("measurement drafts", () => {
  it("turns whole numbers within bounds into measurements", () => {
    expect(toFitMeasurements({ heightCm: " 165 ", weightKg: "60" })).toEqual({
      heightCm: 165,
      weightKg: 60,
    });
  });

  it.each([
    [{ heightCm: "", weightKg: "60" }],
    [{ heightCm: "165.5", weightKg: "60" }],
    [{ heightCm: "40", weightKg: "60" }],
    [{ heightCm: "165", weightKg: "250" }],
  ])("refuses %o", (draft) => {
    expect(toFitMeasurements(draft)).toBeNull();
  });

  it("prefills a draft from saved measurements, or leaves it empty", () => {
    expect(toMeasurementDraft({ heightCm: 165, weightKg: 60 })).toEqual({
      heightCm: "165",
      weightKg: "60",
    });
    expect(toMeasurementDraft(null)).toEqual(EMPTY_MEASUREMENT_DRAFT);
  });
});

describe("buildFitPagePath", () => {
  it("puts the measurements in the fit page's query string", () => {
    expect(buildFitPagePath({ heightCm: 165, weightKg: 60 })).toBe("/fit?heightCm=165&weightKg=60");
  });
});
