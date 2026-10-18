import {
  IDENTITY_DOCUMENT_TYPE,
  type IdentityDocumentType,
  RIDER_EMPLOYMENT_TYPE,
  RIDER_STATUS,
  type RiderEmploymentType,
  type RiderStatus,
} from "../api/ridersSchemas";

type BadgeTone = "neutral" | "positive" | "success" | "negative";

export const RIDER_STATUS_LABELS: Record<RiderStatus, string> = {
  [RIDER_STATUS.PENDING_VERIFICATION]: "Needs ID check",
  [RIDER_STATUS.ACTIVE]: "Active",
  [RIDER_STATUS.SUSPENDED]: "Suspended",
  [RIDER_STATUS.OFFBOARDED]: "Offboarded",
};

export const RIDER_STATUS_TONES: Record<RiderStatus, BadgeTone> = {
  [RIDER_STATUS.PENDING_VERIFICATION]: "positive",
  [RIDER_STATUS.ACTIVE]: "success",
  [RIDER_STATUS.SUSPENDED]: "negative",
  [RIDER_STATUS.OFFBOARDED]: "neutral",
};

export const RIDER_EMPLOYMENT_TYPE_LABELS: Record<RiderEmploymentType, string> = {
  [RIDER_EMPLOYMENT_TYPE.EMPLOYEE]: "Employee",
  [RIDER_EMPLOYMENT_TYPE.CONTRACTOR]: "Contractor",
};

export const IDENTITY_DOCUMENT_TYPE_LABELS: Record<IdentityDocumentType, string> = {
  [IDENTITY_DOCUMENT_TYPE.CITIZENSHIP]: "Citizenship card",
  [IDENTITY_DOCUMENT_TYPE.DRIVING_LICENCE]: "Driving licence",
  [IDENTITY_DOCUMENT_TYPE.PASSPORT]: "Passport",
  [IDENTITY_DOCUMENT_TYPE.NATIONAL_ID]: "National ID",
};
