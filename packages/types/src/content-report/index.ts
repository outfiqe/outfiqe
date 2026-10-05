export type ContentReportTarget =
  | "CREATOR_LOOK"
  | "CREATOR_LOOK_COMMENT"
  | "OUTFIT_BUILD"
  | "OUTFIT_BUILD_COMMENT"
  | "OUTFIT_PHOTO";

export type ContentReportReason =
  | "SPAM"
  | "HARASSMENT_OR_BULLYING"
  | "HATE_SPEECH"
  | "NUDITY_OR_SEXUAL_CONTENT"
  | "VIOLENCE_OR_DANGEROUS_ACTS"
  | "SCAM_OR_MISLEADING"
  | "INTELLECTUAL_PROPERTY"
  | "OTHER";

export type ContentReportStatus = "OPEN" | "ACTIONED" | "DISMISSED";
