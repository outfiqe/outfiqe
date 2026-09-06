const UUID_BYTE_LENGTH = 16;
const VERSION_BYTE_INDEX = 6;
const VARIANT_BYTE_INDEX = 8;
const VERSION_4_MASK = 0x40;
const VERSION_NIBBLE_MASK = 0x0f;
const VARIANT_BITS_MASK = 0x80;
const VARIANT_NIBBLE_MASK = 0x3f;
const BYTE_MAX = 256;
const HEX_RADIX = 16;
const GROUP_BOUNDARIES = [4, 6, 8, 10, 16] as const;

type AmbientCrypto = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

const getAmbientCrypto = (): AmbientCrypto | undefined =>
  (globalThis as { crypto?: AmbientCrypto }).crypto;

const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  const ambientCrypto = getAmbientCrypto();
  if (ambientCrypto?.getRandomValues) {
    ambientCrypto.getRandomValues(bytes);
    return bytes;
  }
  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * BYTE_MAX);
  }
  return bytes;
};

export const generateUuid = (): string => {
  const ambientCrypto = getAmbientCrypto();
  if (ambientCrypto?.randomUUID) {
    return ambientCrypto.randomUUID();
  }

  const bytes = randomBytes(UUID_BYTE_LENGTH);
  bytes[VERSION_BYTE_INDEX] = (bytes[VERSION_BYTE_INDEX]! & VERSION_NIBBLE_MASK) | VERSION_4_MASK;
  bytes[VARIANT_BYTE_INDEX] =
    (bytes[VARIANT_BYTE_INDEX]! & VARIANT_NIBBLE_MASK) | VARIANT_BITS_MASK;

  const hex = Array.from(bytes, (byte) => byte.toString(HEX_RADIX).padStart(2, "0"));
  let previousBoundary = 0;
  const groups = GROUP_BOUNDARIES.map((boundary) => {
    const group = hex.slice(previousBoundary, boundary).join("");
    previousBoundary = boundary;
    return group;
  });
  return groups.join("-");
};
