import type { Hub, HubRequestBody } from "../api/hubsSchemas";
import {
  DEFAULT_HUB_COUNTRY_CODE,
  DEFAULT_HUB_TIME_ZONE,
  NEPAL_WORKING_WEEK,
  WEEKDAYS,
} from "../constants/weekdays";
import type { HubFormValues } from "../schemas/hubForm.schema";

export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const ROUND_TIME_SEPARATOR = ",";
const DEFAULT_READY_CUTOFF_MINUTES = "60";

export const parseRoundTimes = (raw: string): string[] | null => {
  const roundTimes = raw
    .split(ROUND_TIME_SEPARATOR)
    .map((roundTime) => roundTime.trim())
    .filter((roundTime) => roundTime !== "");
  const isValid =
    roundTimes.length > 0 &&
    roundTimes.every((roundTime) => TIME_OF_DAY_PATTERN.test(roundTime)) &&
    new Set(roundTimes).size === roundTimes.length;
  return isValid ? [...roundTimes].sort() : null;
};

export const EMPTY_HUB_FORM: HubFormValues = {
  name: "",
  address: "",
  city: "",
  phone: "",
  timeZone: DEFAULT_HUB_TIME_ZONE,
  workingDays: NEPAL_WORKING_WEEK,
  openTime: "09:00",
  closeTime: "19:00",
  pickupRoundTimes: "11:00, 15:00",
  readyCutoffMinutes: DEFAULT_READY_CUTOFF_MINUTES,
  partnerCollectionTime: "17:30",
  isActive: true,
};

export const toHubFormValues = (hub: Hub): HubFormValues => ({
  name: hub.name,
  address: hub.address,
  city: hub.city,
  phone: hub.phone,
  timeZone: hub.timeZone,
  workingDays: hub.workingDays,
  openTime: hub.openTime,
  closeTime: hub.closeTime,
  pickupRoundTimes: hub.pickupRoundTimes.join(`${ROUND_TIME_SEPARATOR} `),
  readyCutoffMinutes: String(hub.readyCutoffMinutes),
  partnerCollectionTime: hub.partnerCollectionTime,
  isActive: hub.isActive,
});

export const toHubRequestBody = (
  values: HubFormValues,
  countryCode: string = DEFAULT_HUB_COUNTRY_CODE,
): HubRequestBody => ({
  ...values,
  countryCode,
  workingDays: [...values.workingDays].sort(),
  pickupRoundTimes: parseRoundTimes(values.pickupRoundTimes) ?? [],
  readyCutoffMinutes: Number(values.readyCutoffMinutes),
});

export const formatWorkingDays = (workingDays: readonly number[]): string =>
  WEEKDAYS.filter(({ value }) => workingDays.includes(value))
    .map(({ shortLabel }) => shortLabel)
    .join(", ");
