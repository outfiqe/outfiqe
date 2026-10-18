import { randomInt } from "node:crypto";

import { CROCKFORD_BASE32_ALPHABET } from "@outfiqe/utils";

export const generateRandomCode = (length: number): string =>
  Array.from(
    { length },
    () => CROCKFORD_BASE32_ALPHABET[randomInt(CROCKFORD_BASE32_ALPHABET.length)],
  ).join("");
