import { apiClient } from "@/lib/apiClient";

import {
  type AssignRiderTaskBody,
  type PickupBoardPage,
  pickupBoardPageSchema,
  type RiderTasksPage,
  riderTasksPageSchema,
  type RiderTaskSummary,
  riderTaskSummarySchema,
} from "./pickupBoardSchemas";

const PICKUP_BOARD_PATH = "/logistics/admin/pickup-board";
const RIDER_TASKS_PATH = "/logistics/admin/rider-tasks";

export const pickupBoardApi = {
  async listWaitingPickups(hubId: string, cursor?: string): Promise<PickupBoardPage> {
    const res = await apiClient.get(PICKUP_BOARD_PATH, { params: { hubId, cursor } });
    return pickupBoardPageSchema.parse(res.data);
  },

  async listRiderTasks(hubId: string, cursor?: string): Promise<RiderTasksPage> {
    const res = await apiClient.get(RIDER_TASKS_PATH, { params: { hubId, cursor } });
    return riderTasksPageSchema.parse(res.data);
  },

  async assignRiderTask(body: AssignRiderTaskBody): Promise<RiderTaskSummary> {
    const res = await apiClient.post(RIDER_TASKS_PATH, body);
    return riderTaskSummarySchema.parse(res.data);
  },

  async cancelRiderTask(taskId: string): Promise<RiderTaskSummary> {
    const res = await apiClient.post(`${RIDER_TASKS_PATH}/${taskId}/cancel`);
    return riderTaskSummarySchema.parse(res.data);
  },
};
