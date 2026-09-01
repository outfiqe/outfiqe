const PHONE_PREFIX = "98";
const PHONE_BODY_LENGTH = 8;
const PHONE_BODY_MODULUS = 10 ** PHONE_BODY_LENGTH;

let phoneSerial = 0;

export const uniquePhone = (): string => {
  phoneSerial += 1;
  const body = String(phoneSerial % PHONE_BODY_MODULUS).padStart(PHONE_BODY_LENGTH, "0");
  return `${PHONE_PREFIX}${body}`;
};
