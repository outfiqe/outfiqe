import { z } from "zod";

import { nepalPhoneField } from "@/shared/lib/nepalPhoneField";

export const ADDRESS_LABEL_MAX = 50;

export const savedAddressSchema = z.object({
  id: z.string(),
  label: z.string().nullable(),
  fullName: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  landmark: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Address = z.infer<typeof savedAddressSchema>;

export const savedAddressListSchema = z.array(savedAddressSchema);

export const addressFormSchema = z.object({
  label: z.string().trim().max(ADDRESS_LABEL_MAX),
  fullName: z.string().trim().min(1, "Enter the recipient's full name").max(120),
  phone: nepalPhoneField(),
  address: z.string().trim().min(1, "Enter the delivery address").max(300),
  city: z.string().trim().min(1, "Select a city").max(120),
  landmark: z.string().trim().max(200),
  isDefault: z.boolean(),
});
export type AddressFormInput = z.infer<typeof addressFormSchema>;
