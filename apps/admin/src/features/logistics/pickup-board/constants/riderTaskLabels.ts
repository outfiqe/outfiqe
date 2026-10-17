import { RIDER_TASK_STATUS, type RiderTaskStatus } from "../api/pickupBoardSchemas";

type BadgeTone = "neutral" | "positive" | "success" | "negative";

export const RIDER_TASK_STATUS_LABELS: Record<RiderTaskStatus, string> = {
  [RIDER_TASK_STATUS.ASSIGNED]: "Assigned",
  [RIDER_TASK_STATUS.IN_PROGRESS]: "Collecting",
  [RIDER_TASK_STATUS.COMPLETED]: "Done",
  [RIDER_TASK_STATUS.WASTED]: "Wasted visit",
  [RIDER_TASK_STATUS.CANCELLED]: "Cancelled",
};

export const RIDER_TASK_STATUS_TONES: Record<RiderTaskStatus, BadgeTone> = {
  [RIDER_TASK_STATUS.ASSIGNED]: "neutral",
  [RIDER_TASK_STATUS.IN_PROGRESS]: "positive",
  [RIDER_TASK_STATUS.COMPLETED]: "success",
  [RIDER_TASK_STATUS.WASTED]: "negative",
  [RIDER_TASK_STATUS.CANCELLED]: "neutral",
};
