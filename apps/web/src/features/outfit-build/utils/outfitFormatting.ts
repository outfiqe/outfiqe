const LAKH_GROUPING_LOCALE = "en-IN";
const NEPAL_TIME_ZONE = "Asia/Kathmandu";
const NEPALI_DATE_LOCALE = "ne-NP";
const ENGLISH_DATE_LOCALE = "en-GB";
const NEPALI_LOCALE = "ne";

const lakhNumberFormat = new Intl.NumberFormat(LAKH_GROUPING_LOCALE, {
  maximumFractionDigits: 0,
});

export const formatLakhAmount = (amount: number): string => lakhNumberFormat.format(amount);

export const formatNepalDateTime = (isoDate: string, locale: string): string =>
  new Intl.DateTimeFormat(locale === NEPALI_LOCALE ? NEPALI_DATE_LOCALE : ENGLISH_DATE_LOCALE, {
    timeZone: NEPAL_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
