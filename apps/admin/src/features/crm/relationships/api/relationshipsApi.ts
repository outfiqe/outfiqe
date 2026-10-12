import { apiClient } from "@/lib/apiClient";

import {
  type CustomerDetail,
  customerDetailSchema,
  type CustomerListPage,
  customerListPageSchema,
  type PartnerDetail,
  partnerDetailSchema,
  type PartnerListPage,
  partnerListPageSchema,
} from "./relationshipsSchemas";

type ListParams = { q?: string; page?: number; pageSize?: number };

const listParams = ({ q, page, pageSize }: ListParams) => ({
  ...(q ? { q } : {}),
  ...(page ? { page } : {}),
  ...(pageSize ? { pageSize } : {}),
});

export const crmRelationshipsApi = {
  async listPartners(params: ListParams = {}): Promise<PartnerListPage> {
    const res = await apiClient.get<PartnerListPage>("/crm/partners", {
      params: listParams(params),
    });
    return partnerListPageSchema.parse(res.data);
  },

  async getPartner(creatorId: string): Promise<PartnerDetail> {
    const res = await apiClient.get<PartnerDetail>(`/crm/partners/${creatorId}`);
    return partnerDetailSchema.parse(res.data);
  },

  async listCustomers(params: ListParams = {}): Promise<CustomerListPage> {
    const res = await apiClient.get<CustomerListPage>("/crm/customers", {
      params: listParams(params),
    });
    return customerListPageSchema.parse(res.data);
  },

  async getCustomer(userId: string): Promise<CustomerDetail> {
    const res = await apiClient.get<CustomerDetail>(`/crm/customers/${userId}`);
    return customerDetailSchema.parse(res.data);
  },
};
