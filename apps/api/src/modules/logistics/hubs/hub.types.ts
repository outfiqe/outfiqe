export type HubPickupZoneView = {
  id: string;
  name: string;
};

export type HubView = {
  id: string;
  name: string;
  countryCode: string;
  address: string;
  city: string;
  phone: string;
  timeZone: string;
  workingDays: number[];
  openTime: string;
  closeTime: string;
  pickupRoundTimes: string[];
  readyCutoffMinutes: number;
  partnerCollectionTime: string;
  isActive: boolean;
  pickupZones: HubPickupZoneView[];
};
