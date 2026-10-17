export const PLATFORM_DEFAULT_COUNTRY_CODE = "NP";

export type CountrySettings = {
  currency: string;
  timeZone: string;
  workingDays: readonly number[];
  codRefusalLimit: number;
  codRefusalWindowDays: number;
};

const SUNDAY = 0;
const MONDAY = 1;
const TUESDAY = 2;
const WEDNESDAY = 3;
const THURSDAY = 4;
const FRIDAY = 5;
const NEPAL_COD_REFUSAL_LIMIT = 2;
const NEPAL_COD_REFUSAL_WINDOW_DAYS = 365;

const NEPAL_SETTINGS: CountrySettings = {
  currency: "NPR",
  timeZone: "Asia/Kathmandu",
  workingDays: [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY],
  codRefusalLimit: NEPAL_COD_REFUSAL_LIMIT,
  codRefusalWindowDays: NEPAL_COD_REFUSAL_WINDOW_DAYS,
};

export const PLATFORM_DEFAULT_COUNTRY_SETTINGS = NEPAL_SETTINGS;

export const COUNTRY_SETTINGS: Readonly<Record<string, CountrySettings>> = {
  [PLATFORM_DEFAULT_COUNTRY_CODE]: NEPAL_SETTINGS,
};

export const SUPPORTED_COUNTRY_CODES = Object.keys(COUNTRY_SETTINGS);
