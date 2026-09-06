import { apiClient } from "@/lib/apiClient";

import {
  couponPageSchema,
  couponPerformanceSchema,
  couponRedemptionPageSchema,
  couponSchema,
  type CouponStatusValue,
  type CreateCouponInput,
  type UpdateCouponBudgetInput,
} from "./schemas";

export type RedemptionSearchFilters = {
  code?: string;
  userId?: string;
  orderId?: string;
  cursor?: string;
};

export const couponsApi = {
  async list(status?: CouponStatusValue, cursor?: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    const res = await apiClient.get<unknown>(`/admin/coupons${query ? `?${query}` : ""}`);
    return couponPageSchema.parse(res.data);
  },

  async create(input: CreateCouponInput) {
    const res = await apiClient.post<unknown>("/admin/coupons", input);
    return couponSchema.parse(res.data);
  },

  async getById(id: string) {
    const res = await apiClient.get<unknown>(`/admin/coupons/${id}`);
    return couponSchema.parse(res.data);
  },

  async updateStatus(id: string, status: CouponStatusValue) {
    const res = await apiClient.patch<unknown>(`/admin/coupons/${id}/status`, { status });
    return couponSchema.parse(res.data);
  },

  async approve(id: string) {
    const res = await apiClient.patch<unknown>(`/admin/coupons/${id}/approve`, {});
    return couponSchema.parse(res.data);
  },

  async updateBudget(id: string, input: UpdateCouponBudgetInput) {
    const res = await apiClient.patch<unknown>(`/admin/coupons/${id}/budget`, input);
    return couponSchema.parse(res.data);
  },

  async getPerformance(id: string) {
    const res = await apiClient.get<unknown>(`/admin/coupons/${id}/performance`);
    return couponPerformanceSchema.parse(res.data);
  },

  async searchRedemptions(filters: RedemptionSearchFilters) {
    const params = new URLSearchParams();
    if (filters.code) params.set("code", filters.code);
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.orderId) params.set("orderId", filters.orderId);
    if (filters.cursor) params.set("cursor", filters.cursor);
    const query = params.toString();
    const res = await apiClient.get<unknown>(
      `/admin/coupons/redemptions${query ? `?${query}` : ""}`,
    );
    return couponRedemptionPageSchema.parse(res.data);
  },
};
