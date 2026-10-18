import { apiClient } from "@/lib/apiClient";

import {
  type InviteRiderBody,
  type Rider,
  RIDER_STATUS,
  type RiderIdentityCheckBody,
  type RiderInvite,
  riderInvitesResponseSchema,
  riderSchema,
  type RidersPage,
  ridersPageSchema,
  type RiderStatus,
} from "./ridersSchemas";

const RIDERS_PATH = "/logistics/admin/riders";
const MAX_RIDERS_PER_PAGE = 50;

export const ridersApi = {
  async list(hubId: string, cursor?: string): Promise<RidersPage> {
    const res = await apiClient.get(RIDERS_PATH, { params: { hubId, cursor } });
    return ridersPageSchema.parse(res.data);
  },

  async listActive(hubId: string): Promise<Rider[]> {
    const res = await apiClient.get(RIDERS_PATH, {
      params: { hubId, status: RIDER_STATUS.ACTIVE, limit: MAX_RIDERS_PER_PAGE },
    });
    return ridersPageSchema.parse(res.data).items;
  },

  async listInvites(): Promise<RiderInvite[]> {
    const res = await apiClient.get(`${RIDERS_PATH}/invites`);
    return riderInvitesResponseSchema.parse(res.data).invites;
  },

  async invite(body: InviteRiderBody): Promise<void> {
    await apiClient.post(`${RIDERS_PATH}/invites`, body);
  },

  async recordIdentityCheck(riderId: string, body: RiderIdentityCheckBody): Promise<Rider> {
    const res = await apiClient.post(`${RIDERS_PATH}/${riderId}/identity-check`, body);
    return riderSchema.parse(res.data);
  },

  async setStatus(riderId: string, status: RiderStatus): Promise<Rider> {
    const res = await apiClient.patch(`${RIDERS_PATH}/${riderId}/status`, { status });
    return riderSchema.parse(res.data);
  },
};
