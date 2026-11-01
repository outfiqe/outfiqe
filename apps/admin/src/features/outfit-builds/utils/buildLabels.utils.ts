import { BUILD_EVENT_LABEL, UNKNOWN_BUILD_EVENT_LABEL } from "../constants/buildLabels.constants";

const NO_CHANGES = 0;
const SINGLE_CHANGE = 1;

export const toBuildEventLabel = (eventType: string): string =>
  BUILD_EVENT_LABEL[eventType] ?? UNKNOWN_BUILD_EVENT_LABEL;

export const toBuildChangeCountLabel = (changeCount: number): string => {
  if (changeCount === NO_CHANGES) return "No changes yet";
  if (changeCount === SINGLE_CHANGE) return "1 change";
  return `${changeCount.toLocaleString()} changes`;
};
