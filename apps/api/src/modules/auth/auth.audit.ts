import logger from "#lib/winston.utils.js";

type AuthAuditOutcome = "success" | "failure";

export const auditLog = (
  outcome: AuthAuditOutcome,
  message: string,
  fields: { event: string; userId?: string; email?: string; ip?: string },
): void => {
  const level = outcome === "success" ? "info" : "warn";
  logger[level](message, { ...fields, outcome });
};
