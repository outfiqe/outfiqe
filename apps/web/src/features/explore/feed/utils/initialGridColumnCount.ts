import {
  EXPLORE_GRID_HANDHELD_COLUMN_COUNT,
  EXPLORE_GRID_WIDE_SCREEN_COLUMN_COUNT,
} from "../../constants/explore.constants";

const HANDHELD_DEVICE_TYPES = new Set(["mobile", "tablet"]);

export const pickInitialExploreGridColumnCount = (deviceType: string | undefined): number =>
  deviceType && HANDHELD_DEVICE_TYPES.has(deviceType)
    ? EXPLORE_GRID_HANDHELD_COLUMN_COUNT
    : EXPLORE_GRID_WIDE_SCREEN_COLUMN_COUNT;
