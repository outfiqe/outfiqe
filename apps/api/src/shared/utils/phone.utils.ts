import { NEPAL_PHONE_REGEX } from "@outfiqe/utils";
import { isSupportedCountry, parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(NEPAL_PHONE_REGEX, "Phone must be 10 digits starting with 98");

export const toE164PhoneNumber = (phone: string, countryCode: string): string | null => {
  if (!isSupportedCountry(countryCode)) return null;
  const parsedPhone = parsePhoneNumberFromString(phone, countryCode);
  return parsedPhone?.isValid() ? parsedPhone.number : null;
};
