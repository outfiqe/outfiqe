import type { CaptureResult, Properties } from "posthog-js";

import { REDACTED_VALUE } from "../constants/analytics.constants";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const NEPAL_PHONE_PATTERN = /(?<![\dA-Za-z])(?:\+?977[\s-]?)?9[678]\d{8}(?![\dA-Za-z])/g;

export const redactPersonalText = (text: string): string =>
  text.replace(EMAIL_PATTERN, REDACTED_VALUE).replace(NEPAL_PHONE_PATTERN, REDACTED_VALUE);

const redactValue = (value: unknown): unknown => {
  if (typeof value === "string") return redactPersonalText(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value !== null && typeof value === "object") return redactProperties(value);
  return value;
};

const redactProperties = (properties: object): Properties =>
  Object.fromEntries(
    Object.entries(properties).map(([propertyName, propertyValue]) => [
      propertyName,
      redactValue(propertyValue),
    ]),
  );

export const scrubPersonalData = (captureResult: CaptureResult): CaptureResult => {
  const { properties, $set, $set_once } = captureResult;
  return {
    ...captureResult,
    properties: redactProperties(properties),
    ...($set ? { $set: redactProperties($set) } : {}),
    ...($set_once ? { $set_once: redactProperties($set_once) } : {}),
  };
};
