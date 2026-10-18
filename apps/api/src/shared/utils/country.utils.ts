import { z } from "zod";

import { SUPPORTED_COUNTRY_CODES } from "#constants/country.constants.js";

export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
};

export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((countryCode) => SUPPORTED_COUNTRY_CODES.includes(countryCode), {
    message: "Outfiqe doesn't operate in that country yet.",
  });
