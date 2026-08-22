import type { BadgeLayer } from "../../schemas";
import { CANVAS_SIZE_PX } from "./studioLayer.constants";

export const pxToPercent = (px: number): number => (px / CANVAS_SIZE_PX) * 100;

export const percentToPx = (percent: number): number => (percent / 100) * CANVAS_SIZE_PX;

export const generateLayerId = (): string =>
  `layer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const moveLayerUp = (layers: BadgeLayer[], layerId: string): BadgeLayer[] => {
  const index = layers.findIndex((layer) => layer.id === layerId);
  if (index === -1 || index === layers.length - 1) return layers;
  const next = [...layers];
  [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
  return next;
};

export const moveLayerDown = (layers: BadgeLayer[], layerId: string): BadgeLayer[] => {
  const index = layers.findIndex((layer) => layer.id === layerId);
  if (index <= 0) return layers;
  const next = [...layers];
  [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
  return next;
};
