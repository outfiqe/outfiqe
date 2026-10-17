export const CROCKFORD_BASE32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const PICKUP_CODE_LENGTH = 8;

export const BAG_TAG_CODE_LENGTH = 10;

const CODE_SEPARATOR_PATTERN = /[\s-]/g;
const CROCKFORD_LOOKALIKE_PATTERN = /[ILO]/g;
const CROCKFORD_LOOKALIKE_REPLACEMENTS: Readonly<Record<string, string>> = {
  I: "1",
  L: "1",
  O: "0",
};

export const normalizeTypedCode = (typedCode: string): string =>
  typedCode
    .toUpperCase()
    .replace(CODE_SEPARATOR_PATTERN, "")
    .replace(
      CROCKFORD_LOOKALIKE_PATTERN,
      (lookalike) => CROCKFORD_LOOKALIKE_REPLACEMENTS[lookalike] ?? lookalike,
    );

export const isCrockfordCode = (code: string, expectedLength: number): boolean =>
  code.length === expectedLength &&
  [...code].every((character) => CROCKFORD_BASE32_ALPHABET.includes(character));
