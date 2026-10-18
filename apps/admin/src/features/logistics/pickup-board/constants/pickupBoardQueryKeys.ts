export const PICKUP_BOARD_QUERY_KEY = ["logistics-pickup-board"] as const;

export const pickupBoardForHubQueryKey = (hubId: string) =>
  ["logistics-pickup-board", hubId] as const;

export const RIDER_TASKS_QUERY_KEY = ["logistics-rider-tasks"] as const;

export const riderTasksForHubQueryKey = (hubId: string) =>
  ["logistics-rider-tasks", hubId] as const;
