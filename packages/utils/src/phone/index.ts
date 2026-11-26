export const NEPAL_PHONE_REGEX = /^98\d{8}$/;

const PHONE_SEPARATORS_REGEX = /[\s-]/g;

export const stripPhoneSeparators = (phone: string): string =>
  phone.replace(PHONE_SEPARATORS_REGEX, "");
