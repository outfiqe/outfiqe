import { CROCKFORD_BASE32_ALPHABET, isCrockfordCode } from "@outfiqe/utils";
import { describe, expect, it } from "vitest";

import { generateRandomCode } from "./random-code.utils.js";

const CODE_LENGTH = 8;
const SAMPLE_SIZE = 200;

describe("generateRandomCode", () => {
  it("makes a code of the requested length from the shared alphabet", () => {
    const code = generateRandomCode(CODE_LENGTH);

    expect(isCrockfordCode(code, CODE_LENGTH)).toBe(true);
  });

  it("does not repeat itself across many codes", () => {
    const codes = new Set(
      Array.from({ length: SAMPLE_SIZE }, () => generateRandomCode(CODE_LENGTH)),
    );

    expect(codes.size).toBe(SAMPLE_SIZE);
  });

  it("only uses characters from the alphabet", () => {
    const code = generateRandomCode(SAMPLE_SIZE);

    expect([...code].every((character) => CROCKFORD_BASE32_ALPHABET.includes(character))).toBe(
      true,
    );
  });
});
