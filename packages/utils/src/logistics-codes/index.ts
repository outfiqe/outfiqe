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

export const PARCEL_CODE_PREFIX = "OFQ";

export const PARCEL_CODE_BODY_LENGTH = 8;

const PARCEL_CODE_GROUP_LENGTH = 4;
const FIRST_CHARACTER_INDEX = 0;
const PARCEL_PREFIX_TYPED_WITH_ZERO = "0FQ";

export const normalizeParcelCode = (typedCode: string): string | null => {
  const compactCode = typedCode.toUpperCase().replace(CODE_SEPARATOR_PATTERN, "");
  const hasParcelPrefix =
    compactCode.startsWith(PARCEL_CODE_PREFIX) ||
    compactCode.startsWith(PARCEL_PREFIX_TYPED_WITH_ZERO);
  if (!hasParcelPrefix) return null;
  const codeBody = normalizeTypedCode(compactCode.slice(PARCEL_CODE_PREFIX.length));
  return isCrockfordCode(codeBody, PARCEL_CODE_BODY_LENGTH)
    ? `${PARCEL_CODE_PREFIX}${codeBody}`
    : null;
};

const PATTERN_SPECIAL_CHARACTER = /[\\^$.*+?()[\]{}|]/;

export const isFixedTextPattern = (referencePattern: string): boolean =>
  !PATTERN_SPECIAL_CHARACTER.test(referencePattern);

export const suggestReferencePattern = (fixedText: string): string => `${fixedText}\\d+`;

export const describeFixedTextPatternProblem = (fixedText: string): string =>
  `"${fixedText}" only matches that exact text, so every real parcel number would be refused. Add the part that changes, for example ${suggestReferencePattern(fixedText)} for "${fixedText}" followed by digits.`;

export const formatParcelCode = (parcelCode: string): string => {
  const codeBody = parcelCode.slice(PARCEL_CODE_PREFIX.length);
  return [
    PARCEL_CODE_PREFIX,
    codeBody.slice(FIRST_CHARACTER_INDEX, PARCEL_CODE_GROUP_LENGTH),
    codeBody.slice(PARCEL_CODE_GROUP_LENGTH),
  ].join("-");
};
