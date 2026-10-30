import { z } from "zod";

import { SUPPORTED_COUNTRY_CODES } from "#constants/country.constants.js";

const TIME_ZONE_ACCEPTED = true;
const TIME_ZONE_REJECTED = false;

export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return TIME_ZONE_ACCEPTED;
  } catch {
    return TIME_ZONE_REJECTED;
  }
};

export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((countryCode) => SUPPORTED_COUNTRY_CODES.includes(countryCode), {
    message: "Outfiqe doesn't operate in that country yet.",
  });
