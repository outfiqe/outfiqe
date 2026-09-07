import { z } from "zod";

export const FULL_NAME_MAX = 120;
export const PHONE_MIN = 6;
export const PHONE_MAX = 20;
export const ADDRESS_MAX = 300;
export const CITY_MAX = 120;
export const LANDMARK_MAX = 200;

export const shippingAddressFields = {
  fullName: z.string().trim().min(1).max(FULL_NAME_MAX),
  phone: z.string().trim().min(PHONE_MIN).max(PHONE_MAX),
  address: z.string().trim().min(1).max(ADDRESS_MAX),
  city: z.string().trim().min(1).max(CITY_MAX),
  landmark: z.string().trim().max(LANDMARK_MAX).optional(),
};

export const shippingAddressSchema = z.object(shippingAddressFields);

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
