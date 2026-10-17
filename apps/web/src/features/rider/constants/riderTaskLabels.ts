import { RIDER_TASK_STATUS, type RiderTaskStatus } from "../api/riderSchemas";

export const RIDER_TASK_STATUS_LABELS: Record<RiderTaskStatus, string> = {
  [RIDER_TASK_STATUS.ASSIGNED]: "Not started",
  [RIDER_TASK_STATUS.IN_PROGRESS]: "Collecting",
  [RIDER_TASK_STATUS.COMPLETED]: "Done",
  [RIDER_TASK_STATUS.WASTED]: "Wasted visit",
  [RIDER_TASK_STATUS.CANCELLED]: "Cancelled",
};

export const OPEN_RIDER_TASK_STATUSES: ReadonlySet<RiderTaskStatus> = new Set([
  RIDER_TASK_STATUS.ASSIGNED,
  RIDER_TASK_STATUS.IN_PROGRESS,
]);
