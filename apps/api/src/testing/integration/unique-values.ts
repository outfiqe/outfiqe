import { randomInt } from "node:crypto";

const PHONE_PREFIX = "98";
const PHONE_BODY_LENGTH = 8;
const PHONE_BODY_MODULUS = 10 ** PHONE_BODY_LENGTH;

let nextPhoneBody = randomInt(PHONE_BODY_MODULUS);

export const uniquePhone = (): string => {
  const body = String(nextPhoneBody % PHONE_BODY_MODULUS).padStart(PHONE_BODY_LENGTH, "0");
  nextPhoneBody += 1;
  return `${PHONE_PREFIX}${body}`;
};
