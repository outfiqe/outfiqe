import type { JsonValue } from "./openapi.types.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENCODED_JSON_PREFIX = "eyJ";
const DOT_SEPARATED_TOKEN_PATTERN = /^[\w-]+(\.[\w-]+)+$/;
const BCRYPT_OR_ARGON_PREFIX_PATTERN = /^\$(2[aby]|argon2)/;
const SENSITIVE_KEY_WORDS = new Set([
  "token",
  "password",
  "secret",
  "hash",
  "otp",
  "signature",
  "cookie",
  "signed",
]);
const API_KEY_SUFFIX = "apikey";
const KEY_WORD_BOUNDARY_PATTERN = /[-_\s]+|(?<=[a-z0-9])(?=[A-Z])/;
const REDACTED_VALUE = "<redacted>";
const EXAMPLE_DATE_TIME = "2026-01-15T09:30:00.000Z";
const MAX_EXAMPLE_ARRAY_ITEMS = 2;
const UUID_SUFFIX_LENGTH = 12;
const FIRST_PLACEHOLDER_NUMBER = 1;

type PlaceholderRegistry = { uuids: Map<string, string>; emails: Map<string, string> };

const placeholderFor = (
  registry: Map<string, string>,
  original: string,
  build: (n: number) => string,
) => {
  const existingPlaceholder = registry.get(original);
  if (existingPlaceholder) return existingPlaceholder;
  const placeholder = build(registry.size + FIRST_PLACEHOLDER_NUMBER);
  registry.set(original, placeholder);
  return placeholder;
};

const toPlaceholderUuid = (placeholderNumber: number): string =>
  `00000000-0000-4000-8000-${String(placeholderNumber).padStart(UUID_SUFFIX_LENGTH, "0")}`;

const toPlaceholderEmail = (placeholderNumber: number): string =>
  `person${placeholderNumber}@example.com`;

const isSensitiveKey = (key: string): boolean =>
  key.toLowerCase().endsWith(API_KEY_SUFFIX) ||
  key
    .split(KEY_WORD_BOUNDARY_PATTERN)
    .some((keyWord) => SENSITIVE_KEY_WORDS.has(keyWord.toLowerCase()));

const isSignedToken = (value: string): boolean =>
  DOT_SEPARATED_TOKEN_PATTERN.test(value) && value.includes(ENCODED_JSON_PREFIX);

const isSecretLooking = (value: string): boolean =>
  isSignedToken(value) || BCRYPT_OR_ARGON_PREFIX_PATTERN.test(value);

const normalizeString = (value: string, registry: PlaceholderRegistry): string => {
  if (isSecretLooking(value)) return REDACTED_VALUE;
  if (UUID_PATTERN.test(value)) return placeholderFor(registry.uuids, value, toPlaceholderUuid);
  if (ISO_DATE_TIME_PATTERN.test(value)) return EXAMPLE_DATE_TIME;
  if (EMAIL_PATTERN.test(value)) return placeholderFor(registry.emails, value, toPlaceholderEmail);
  return value;
};

const normalizeValue = (value: JsonValue, registry: PlaceholderRegistry): JsonValue => {
  if (typeof value === "string") return normalizeString(value, registry);
  if (Array.isArray(value)) {
    return value.slice(0, MAX_EXAMPLE_ARRAY_ITEMS).map((entry) => normalizeValue(entry, registry));
  }
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      isSensitiveKey(key) && typeof entry === "string"
        ? REDACTED_VALUE
        : normalizeValue(entry, registry),
    ]),
  );
};

export const normalizeExampleValues = (values: JsonValue[]): JsonValue[] => {
  const registry: PlaceholderRegistry = { uuids: new Map(), emails: new Map() };
  return values.map((value) => normalizeValue(value, registry));
};
