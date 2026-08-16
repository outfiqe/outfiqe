export type DeliveryZoneFeeValues = {
  standardDeliveryFee: number;
  freeDeliveryThreshold: number;
  codHandlingFee: number;
};

export type DeliveryZoneCityRecord = {
  id: string;
  city: string;
  cityNormalized: string;
};

export type DeliveryZoneRecord = DeliveryZoneFeeValues & {
  id: string;
  name: string;
  isDefault: boolean;
  cities: DeliveryZoneCityRecord[];
  updatedAt: Date;
};

export type DeliveryZoneView = DeliveryZoneFeeValues & {
  id: string;
  name: string;
  isDefault: boolean;
  cities: string[];
  updatedAt: string;
};

export type DeliveryZoneSnapshot = DeliveryZoneFeeValues & {
  name: string;
  isDefault: boolean;
  cities: string[];
};

export type DeliveryZoneHistoryView = {
  id: string;
  zoneName: string;
  changedByName: string;
  oldValues: DeliveryZoneSnapshot;
  newValues: DeliveryZoneSnapshot;
  createdAt: string;
};
