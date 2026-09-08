import type { PublicSavedAddress, SavedAddressRecord } from "./address.types.js";

export const toPublicSavedAddress = ({
  id,
  label,
  fullName,
  phone,
  address,
  city,
  landmark,
  isDefault,
  createdAt,
  updatedAt,
}: SavedAddressRecord): PublicSavedAddress => ({
  id,
  label,
  fullName,
  phone,
  address,
  city,
  landmark,
  isDefault,
  createdAt: createdAt.toISOString(),
  updatedAt: updatedAt.toISOString(),
});
