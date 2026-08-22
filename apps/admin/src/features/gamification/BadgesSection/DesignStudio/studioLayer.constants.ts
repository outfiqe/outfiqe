import type {
  BadgeBackgroundLayer,
  BadgeIconLayer,
  BadgeShapeValue,
  BadgeTextLayer,
} from "../../schemas";
import { generateLayerId } from "./studioLayer.utils";

export const CANVAS_SIZE_PX = 320;

export const MIN_LAYER_FONT_SIZE = 5;
export const MAX_LAYER_FONT_SIZE = 100;
export const MIN_LAYER_BORDER_WIDTH = 0;
export const MAX_LAYER_BORDER_WIDTH = 8;
export const MAX_BADGE_LAYERS = 12;

export const BADGE_LAYER_TYPE = {
  BACKGROUND: "background",
  ICON: "icon",
  TEXT: "text",
} as const;

export const BADGE_FONT_WEIGHT = {
  NORMAL: "normal",
  BOLD: "bold",
} as const;

export const DEFAULT_BACKGROUND_SHAPE: BadgeShapeValue = "circle";
export const DEFAULT_LAYER_FILL_COLOR = "#94a3b8";

export const LAYER_TYPE_OPTIONS = [
  BADGE_LAYER_TYPE.BACKGROUND,
  BADGE_LAYER_TYPE.ICON,
  BADGE_LAYER_TYPE.TEXT,
] as const;

export const LAYER_TYPE_LABEL: Record<
  (typeof BADGE_LAYER_TYPE)[keyof typeof BADGE_LAYER_TYPE],
  string
> = {
  [BADGE_LAYER_TYPE.BACKGROUND]: "Background",
  [BADGE_LAYER_TYPE.ICON]: "Icon",
  [BADGE_LAYER_TYPE.TEXT]: "Text",
};

const DEFAULT_LAYER_BOUNDS = { x: 10, y: 10, width: 80, height: 80 };

export const createDefaultBackgroundLayer = (
  overrides: Partial<Pick<BadgeBackgroundLayer, "shape" | "fill">> = {},
): BadgeBackgroundLayer => ({
  id: generateLayerId(),
  type: BADGE_LAYER_TYPE.BACKGROUND,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  shape: overrides.shape ?? DEFAULT_BACKGROUND_SHAPE,
  fill: overrides.fill ?? DEFAULT_LAYER_FILL_COLOR,
});

export const createDefaultIconLayer = (): BadgeIconLayer => ({
  id: generateLayerId(),
  type: BADGE_LAYER_TYPE.ICON,
  ...DEFAULT_LAYER_BOUNDS,
  glyph: "⭐",
  fontSize: 50,
});

export const createDefaultTextLayer = (): BadgeTextLayer => ({
  id: generateLayerId(),
  type: BADGE_LAYER_TYPE.TEXT,
  x: 10,
  y: 65,
  width: 80,
  height: 25,
  content: "TEXT",
  color: "#ffffff",
  fontSize: 20,
  fontWeight: BADGE_FONT_WEIGHT.BOLD,
});
