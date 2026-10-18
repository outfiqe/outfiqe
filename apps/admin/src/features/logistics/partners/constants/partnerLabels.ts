import type { ImportRowOutcome, WebhookVerification } from "../api/partnersSchemas";

export const MANUAL_ADAPTER_KEY = "MANUAL";
export const HTTP_JSON_ADAPTER_KEY = "HTTP_JSON";

export const ADAPTER_LABELS: Readonly<Record<string, string>> = {
  [MANUAL_ADAPTER_KEY]: "Manual — staff book in the partner's portal",
  [HTTP_JSON_ADAPTER_KEY]: "Connected — reference JSON API (for testing)",
};

export const CONNECTED_PARTNER_HINTS = [
  "Pick a connected option only once a developer has built the connection for this partner. Until then, choose Manual.",
  "Their API address and keys go in the server settings, never here. After saving, add a hub account on the partner's page with the secret name the developer gives you.",
  "The address they send updates to appears on the partner's page after you save, with a copy button.",
];

export const NO_WEBHOOKS: WebhookVerification = "NONE";

export const WEBHOOK_VERIFICATION_LABELS: Record<WebhookVerification, string> = {
  SIGNATURE: "They sign each update with our secret",
  HEADER_TOKEN: "They send our secret in a header",
  NOTIFY_THEN_FETCH: "They only tell us something changed; we fetch it",
  NONE: "They don't send updates; we ask them",
};

export const IMPORT_ROW_OUTCOME_LABELS: Record<ImportRowOutcome, string> = {
  APPLIED: "Applied",
  NOT_APPLIED: "Saved, no change",
  DUPLICATE: "Already recorded",
  UNMATCHED_REFERENCE: "No matching parcel",
  UNKNOWN_STATUS: "Unknown status",
  INVALID_ROW: "Row has a problem",
};

export const REPLAY_WINDOWS_IN_DAYS = [1, 7, 30] as const;
export const DEFAULT_REPLAY_WINDOW_DAYS = 1;

export const REPLAY_WINDOW_LABELS: Readonly<Record<number, string>> = {
  1: "The last day",
  7: "The last 7 days",
  30: "The last 30 days",
};

export const DEFAULT_PARTNER_COUNTRY_CODE = "NP";
export const DEFAULT_COD_REMITTANCE_DAYS = 7;
export const MAX_COD_REMITTANCE_DAYS = 60;
export const MAX_ZONE_PRIORITY = 100;
export const MAX_STATUS_SHEET_CHARACTERS = 80_000;
