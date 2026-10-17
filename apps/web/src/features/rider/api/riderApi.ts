import { IDEMPOTENCY_HEADER } from "@outfiqe/client";

import { apiClient } from "@/shared/lib/apiClient";

import { type RiderTask, riderTaskSchema, riderTasksResponseSchema } from "./riderSchemas";

const RIDER_TASKS_PATH = "/logistics/rider/tasks";

export type CollectScanRequest = {
  scanId: string;
  taskId: string;
  pickupCode: string;
  bagTagCode: string;
  scannedAt: string;
};

export const riderApi = {
  async listOpenTasks(): Promise<RiderTask[]> {
    const res = await apiClient.get(RIDER_TASKS_PATH);
    return riderTasksResponseSchema.parse(res.data).tasks;
  },

  async getTask(taskId: string): Promise<RiderTask> {
    const res = await apiClient.get(`${RIDER_TASKS_PATH}/${taskId}`);
    return riderTaskSchema.parse(res.data);
  },

  async collectBag({ scanId, taskId, ...scan }: CollectScanRequest): Promise<RiderTask> {
    const res = await apiClient.post(`${RIDER_TASKS_PATH}/${taskId}/collect-scans`, scan, {
      headers: { [IDEMPOTENCY_HEADER]: scanId },
    });
    return riderTaskSchema.parse(res.data);
  },

  async markWasted(taskId: string, reason: string): Promise<RiderTask> {
    const res = await apiClient.post(`${RIDER_TASKS_PATH}/${taskId}/wasted`, { reason });
    return riderTaskSchema.parse(res.data);
  },

  async finishVisit(taskId: string): Promise<RiderTask> {
    const res = await apiClient.post(`${RIDER_TASKS_PATH}/${taskId}/finish`);
    return riderTaskSchema.parse(res.data);
  },
};
