import { subDays } from "date-fns/subDays";

import {
  COUNTRY_SETTINGS,
  PLATFORM_DEFAULT_COUNTRY_SETTINGS,
} from "#constants/country.constants.js";
import { toE164PhoneNumber } from "#lib/phone.utils.js";

import { logisticsRefusalRepository } from "./refusal.repository.js";

export type CashOnDeliveryEligibility = {
  isCashOnDeliveryAllowed: boolean;
  refusalCount: number;
  refusalLimit: number;
  windowDays: number;
};

export const checkCashOnDeliveryEligibility = async ({
  userId,
  phone,
  countryCode,
}: {
  userId: string;
  phone: string | null;
  countryCode: string;
}): Promise<CashOnDeliveryEligibility> => {
  const { codRefusalLimit, codRefusalWindowDays } =
    COUNTRY_SETTINGS[countryCode] ?? PLATFORM_DEFAULT_COUNTRY_SETTINGS;
  const refusalCount = await logisticsRefusalRepository.countActiveRefusalsSince(
    { userId, phoneE164: phone ? toE164PhoneNumber(phone, countryCode) : null },
    subDays(new Date(), codRefusalWindowDays),
  );
  return {
    isCashOnDeliveryAllowed: refusalCount < codRefusalLimit,
    refusalCount,
    refusalLimit: codRefusalLimit,
    windowDays: codRefusalWindowDays,
  };
};
