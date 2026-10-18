export const RIDER_TASKS_QUERY_KEY = ["rider-tasks"] as const;

export const riderTaskQueryKey = (taskId: string) => ["rider-tasks", taskId] as const;

export const RIDER_EARNINGS_QUERY_KEY = ["rider-earnings"] as const;
