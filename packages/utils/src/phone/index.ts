export const NEPAL_PHONE_REGEX = /^98\d{8}$/;

const PHONE_SEPARATORS_REGEX = /[\s-]/g;
const NEPAL_COUNTRY_CODE_PREFIX_REGEX = /^\+?977(?=98\d{8}$)/;

export const stripPhoneSeparators = (phone: string): string =>
  phone.replace(PHONE_SEPARATORS_REGEX, "");

export const normalizeNepalPhone = (phone: string): string =>
  stripPhoneSeparators(phone).replace(NEPAL_COUNTRY_CODE_PREFIX_REGEX, "");
