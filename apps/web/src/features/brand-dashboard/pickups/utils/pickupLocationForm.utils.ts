import type { PickupLocation, PickupLocationRequestBody } from "../api/pickupLocationSchemas";
import type { PickupLocationFormInput } from "../schemas/pickupLocationForm.schema";

const MAP_PIN_PATTERN = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;

type MapPin = { latitude: number; longitude: number };

export const parseMapPin = (mapPin: string): MapPin | null => {
  const match = MAP_PIN_PATTERN.exec(mapPin);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  const isOnTheMap = Math.abs(latitude) <= MAX_LATITUDE && Math.abs(longitude) <= MAX_LONGITUDE;
  return isOnTheMap ? { latitude, longitude } : null;
};

export const formatMapPin = ({
  latitude,
  longitude,
}: Pick<PickupLocation, "latitude" | "longitude">): string =>
  latitude === null || longitude === null ? "" : `${latitude}, ${longitude}`;

const emptyToNull = (value: string): string | null => (value === "" ? null : value);

export const toPickupLocationFormValues = (
  location: PickupLocation | undefined,
): PickupLocationFormInput => ({
  label: location?.label ?? "",
  contactName: location?.contactName ?? "",
  contactPhone: location?.contactPhone ?? "",
  address: location?.address ?? "",
  city: location?.city ?? "",
  landmark: location?.landmark ?? "",
  mapPin: location ? formatMapPin(location) : "",
  openingNote: location?.openingNote ?? "",
});

export const toPickupLocationRequestBody = ({
  mapPin,
  landmark,
  openingNote,
  ...location
}: PickupLocationFormInput): PickupLocationRequestBody => {
  const parsedMapPin = parseMapPin(mapPin);
  return {
    ...location,
    landmark: emptyToNull(landmark),
    openingNote: emptyToNull(openingNote),
    latitude: parsedMapPin?.latitude ?? null,
    longitude: parsedMapPin?.longitude ?? null,
  };
};

export const googleMapsLinkFor = ({ latitude, longitude }: MapPin): string =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
