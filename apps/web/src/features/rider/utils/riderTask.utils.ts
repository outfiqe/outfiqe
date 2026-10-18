import type { RiderTask } from "../api/riderSchemas";

const SHORT_ORDER_ID_LENGTH = 8;
const SINGLE_SCAN = 1;

const SINGLE_ITEM = 1;

export const describeScanCount = (scanCount: number): string =>
  scanCount === SINGLE_SCAN ? "1 scan" : `${scanCount} scans`;

export const describeItemCount = (itemCount: number): string =>
  itemCount === SINGLE_ITEM ? "1 item" : `${itemCount} items`;

export const formatShortOrderId = (orderId: string): string =>
  `#${orderId.slice(0, SHORT_ORDER_ID_LENGTH).toUpperCase()}`;

export const countCollectedStops = (task: Pick<RiderTask, "stops">): number =>
  task.stops.filter((stop) => stop.isCollected).length;

export const buildMapsLink = ({
  latitude,
  longitude,
  address,
  city,
}: RiderTask["pickupLocation"]): string => {
  const destination =
    latitude !== null && longitude !== null ? `${latitude},${longitude}` : `${address}, ${city}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
};

export const formatRoundTime = (roundStartsAt: string): string =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
    new Date(roundStartsAt),
  );
