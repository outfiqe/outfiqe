import { Prisma } from "#generated/prisma/client.js";

export const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const collectConstraintHints = (meta: Record<string, unknown> | null): string[] => {
  if (!meta) return [];

  const hints: string[] = [];

  const legacyTarget = meta.target;
  if (Array.isArray(legacyTarget))
    hints.push(...legacyTarget.filter((entry) => typeof entry === "string"));
  if (typeof legacyTarget === "string") hints.push(legacyTarget);

  const driverCause = asRecord(asRecord(meta.driverAdapterError)?.cause);
  if (driverCause) {
    if (typeof driverCause.originalMessage === "string") hints.push(driverCause.originalMessage);
    const constraintFields = asRecord(driverCause.constraint)?.fields;
    if (Array.isArray(constraintFields)) {
      hints.push(...constraintFields.filter((field) => typeof field === "string"));
    }
  }

  return hints;
};

export const uniqueConstraintTargetIncludes = (error: unknown, columnName: string): boolean => {
  if (!isUniqueConstraintError(error)) return false;

  const meta = asRecord((error as Prisma.PrismaClientKnownRequestError).meta);
  return collectConstraintHints(meta).some((hint) => hint.includes(columnName));
};

export const isForeignKeyConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";

export const isTransactionConflictError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
