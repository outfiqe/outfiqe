export type PickupLocationView = {
  id: string;
  label: string;
  contactName: string;
  contactPhone: string;
  address: string;
  landmark: string | null;
  city: string;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  openingNote: string | null;
  isDefault: boolean;
  isCoveredByOutfiqePickup: boolean;
};
