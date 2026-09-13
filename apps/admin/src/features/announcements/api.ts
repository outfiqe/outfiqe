import { apiClient } from "@/lib/apiClient";

import {
  type AnnouncementFormInput,
  announcementPageSchema,
  announcementSchema,
  type AnnouncementStatusValue,
  type SendAnnouncementInput,
} from "./schemas";

export const announcementsApi = {
  async list(status?: AnnouncementStatusValue, cursor?: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    const res = await apiClient.get<unknown>(`/admin/announcements${query ? `?${query}` : ""}`);
    return announcementPageSchema.parse(res.data);
  },

  async create(input: AnnouncementFormInput) {
    const res = await apiClient.post<unknown>("/admin/announcements", input);
    return announcementSchema.parse(res.data);
  },

  async update(id: string, input: AnnouncementFormInput) {
    const res = await apiClient.patch<unknown>(`/admin/announcements/${id}`, input);
    return announcementSchema.parse(res.data);
  },

  async getById(id: string) {
    const res = await apiClient.get<unknown>(`/admin/announcements/${id}`);
    return announcementSchema.parse(res.data);
  },

  async send(id: string, input: SendAnnouncementInput) {
    const res = await apiClient.post<unknown>(`/admin/announcements/${id}/send`, input);
    return announcementSchema.parse(res.data);
  },

  async cancel(id: string) {
    await apiClient.post<unknown>(`/admin/announcements/${id}/cancel`, {});
  },
};
