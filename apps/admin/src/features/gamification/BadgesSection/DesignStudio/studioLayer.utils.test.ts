import { describe, expect, it } from "vitest";

import type { BadgeLayer } from "../../schemas";
import { CANVAS_SIZE_PX } from "./studioLayer.constants";
import { moveLayerDown, moveLayerUp, percentToPx, pxToPercent } from "./studioLayer.utils";

describe("pxToPercent / percentToPx", () => {
  it("converts a pixel offset to a percentage of the canvas", () => {
    expect(pxToPercent(CANVAS_SIZE_PX)).toBe(100);
    expect(pxToPercent(CANVAS_SIZE_PX / 2)).toBe(50);
    expect(pxToPercent(0)).toBe(0);
  });

  it("converts a percentage back to the matching pixel offset", () => {
    expect(percentToPx(100)).toBe(CANVAS_SIZE_PX);
    expect(percentToPx(50)).toBe(CANVAS_SIZE_PX / 2);
    expect(percentToPx(0)).toBe(0);
  });

  it("round-trips a value through both conversions", () => {
    expect(pxToPercent(percentToPx(37))).toBeCloseTo(37);
  });
});

const layerAt = (id: string): BadgeLayer => ({
  id,
  type: "icon",
  glyph: "⭐",
  fontSize: 50,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
});

describe("moveLayerUp / moveLayerDown", () => {
  const layers = [layerAt("a"), layerAt("b"), layerAt("c")];

  it("swaps a layer with the one after it in stacking order", () => {
    const result = moveLayerUp(layers, "a");
    expect(result.map((layer) => layer.id)).toEqual(["b", "a", "c"]);
  });

  it("does nothing when moving the topmost layer further up", () => {
    const result = moveLayerUp(layers, "c");
    expect(result.map((layer) => layer.id)).toEqual(["a", "b", "c"]);
  });

  it("swaps a layer with the one before it in stacking order", () => {
    const result = moveLayerDown(layers, "c");
    expect(result.map((layer) => layer.id)).toEqual(["a", "c", "b"]);
  });

  it("does nothing when moving the bottommost layer further down", () => {
    const result = moveLayerDown(layers, "a");
    expect(result.map((layer) => layer.id)).toEqual(["a", "b", "c"]);
  });

  it("does nothing for a layer id that doesn't exist", () => {
    expect(moveLayerUp(layers, "missing")).toEqual(layers);
    expect(moveLayerDown(layers, "missing")).toEqual(layers);
  });
});
