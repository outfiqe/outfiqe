import type { ImportRowOutcome } from "../api/partnersSchemas";

export const MANUAL_ADAPTER_KEY = "MANUAL";

export const ADAPTER_LABELS: Readonly<Record<string, string>> = {
  [MANUAL_ADAPTER_KEY]: "Manual — staff book in the partner's portal",
};

export const IMPORT_ROW_OUTCOME_LABELS: Record<ImportRowOutcome, string> = {
  APPLIED: "Applied",
  NOT_APPLIED: "Saved, no change",
  DUPLICATE: "Already recorded",
  UNMATCHED_REFERENCE: "No matching parcel",
  UNKNOWN_STATUS: "Unknown status",
  INVALID_ROW: "Row has a problem",
};

export const DEFAULT_PARTNER_COUNTRY_CODE = "NP";
export const DEFAULT_COD_REMITTANCE_DAYS = 7;
export const MAX_COD_REMITTANCE_DAYS = 60;
export const MAX_ZONE_PRIORITY = 100;
export const MAX_STATUS_SHEET_CHARACTERS = 80_000;
