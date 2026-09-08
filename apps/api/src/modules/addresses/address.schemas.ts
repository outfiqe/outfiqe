import { z } from "zod";

import { shippingAddressFields } from "#lib/shipping-address.schemas.js";

export const ADDRESS_LABEL_MAX = 50;

const labelField = z.string().trim().max(ADDRESS_LABEL_MAX).optional();

export const createAddressSchema = z.object({
  ...shippingAddressFields,
  label: labelField,
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = z
  .object({
    fullName: shippingAddressFields.fullName.optional(),
    phone: shippingAddressFields.phone.optional(),
    address: shippingAddressFields.address.optional(),
    city: shippingAddressFields.city.optional(),
    landmark: shippingAddressFields.landmark,
    label: labelField,
    isDefault: z.boolean().optional(),
  })
  .refine((fields) => Object.values(fields).some((value) => value !== undefined), {
    message: "Provide at least one field to update.",
  });

export const addressIdParamSchema = z.object({ id: z.uuid() });

export type CreateAddressBody = z.infer<typeof createAddressSchema>;
export type UpdateAddressBody = z.infer<typeof updateAddressSchema>;
export type AddressIdParam = z.infer<typeof addressIdParamSchema>;
