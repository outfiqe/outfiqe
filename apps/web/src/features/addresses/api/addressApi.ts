import { apiClient } from "@/shared/lib/apiClient";

import {
  type Address,
  type AddressFormInput,
  savedAddressListSchema,
  savedAddressSchema,
} from "./addressSchemas";

const BASE_PATH = "/addresses";

export const addressApi = {
  async list(): Promise<Address[]> {
    const res = await apiClient.get<Address[]>(BASE_PATH);
    return savedAddressListSchema.parse(res.data);
  },

  async create(input: AddressFormInput): Promise<Address> {
    const res = await apiClient.post<Address>(BASE_PATH, input);
    return savedAddressSchema.parse(res.data);
  },

  async update(id: string, input: AddressFormInput): Promise<Address> {
    const res = await apiClient.patch<Address>(`${BASE_PATH}/${id}`, input);
    return savedAddressSchema.parse(res.data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.del(`${BASE_PATH}/${id}`);
  },

  async setDefault(id: string): Promise<void> {
    await apiClient.patch(`${BASE_PATH}/${id}/default`);
  },
};
