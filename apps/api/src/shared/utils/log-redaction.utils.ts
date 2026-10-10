const REDACTED_VALUE = "[redacted]";
const QUERY_STRING_SEPARATOR = "?";
const QUERY_PAIR_SEPARATOR = "&";
const QUERY_KEY_VALUE_SEPARATOR = "=";

export const SENSITIVE_QUERY_PARAMS: ReadonlySet<string> = new Set(["heightCm", "weightKg"]);

export const redactSensitiveQueryString = (queryString: string): string =>
  queryString
    .split(QUERY_PAIR_SEPARATOR)
    .map((queryPair) => {
      const [key] = queryPair.split(QUERY_KEY_VALUE_SEPARATOR);
      return key !== undefined && SENSITIVE_QUERY_PARAMS.has(key)
        ? `${key}${QUERY_KEY_VALUE_SEPARATOR}${REDACTED_VALUE}`
        : queryPair;
    })
    .join(QUERY_PAIR_SEPARATOR);

export const redactSensitiveQueryParams = (url: string): string => {
  const queryStart = url.indexOf(QUERY_STRING_SEPARATOR);
  if (queryStart === -1) return url;
  const path = url.slice(0, queryStart);
  const queryString = url.slice(queryStart + QUERY_STRING_SEPARATOR.length);
  return `${path}${QUERY_STRING_SEPARATOR}${redactSensitiveQueryString(queryString)}`;
};
