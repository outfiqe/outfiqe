export type SavedAddressRecord = {
  id: string;
  userId: string;
  label: string | null;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  landmark: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicSavedAddress = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  landmark: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateSavedAddressInput = {
  userId: string;
  label: string | null;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  landmark: string | null;
  isDefault: boolean;
};

export type UpdateSavedAddressFields = {
  label?: string | null;
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  landmark?: string | null;
};
