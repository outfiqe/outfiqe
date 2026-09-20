import { Prisma } from "#generated/prisma/client.js";
import { computeBackoffDelayMs, waitMs } from "#lib/backoff.utils.js";

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

const originalPostgresErrorCode = (error: unknown): string | undefined => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  const driverCause = asRecord(asRecord(error.meta)?.driverAdapterError)?.cause;
  const originalCode = asRecord(driverCause)?.originalCode;
  return typeof originalCode === "string" ? originalCode : undefined;
};

const POSTGRES_SERIALIZATION_FAILURE_SQLSTATE = "40001";

const isPrismaClassifiedTransactionConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";

const isRawSerializationFailure = (error: unknown): boolean =>
  originalPostgresErrorCode(error) === POSTGRES_SERIALIZATION_FAILURE_SQLSTATE;

const DRIVER_ADAPTER_ERROR_NAME = "DriverAdapterError";
const DRIVER_ADAPTER_WRITE_CONFLICT_KIND = "TransactionWriteConflict";

const isUnwrappedDriverAdapterWriteConflict = (error: unknown): boolean => {
  const errorRecord = asRecord(error);
  if (errorRecord?.name !== DRIVER_ADAPTER_ERROR_NAME) return false;
  return asRecord(errorRecord.cause)?.kind === DRIVER_ADAPTER_WRITE_CONFLICT_KIND;
};

export const isTransactionConflictError = (error: unknown): boolean =>
  isPrismaClassifiedTransactionConflict(error) ||
  isRawSerializationFailure(error) ||
  isUnwrappedDriverAdapterWriteConflict(error);

const POSTGRES_DEADLOCK_SQLSTATE = "40P01";

export const isDeadlockError = (error: unknown): boolean =>
  isTransactionConflictError(error) ||
  originalPostgresErrorCode(error) === POSTGRES_DEADLOCK_SQLSTATE;

const POSTGRES_CHECK_VIOLATION_SQLSTATE = "23514";

const PRISMA_KNOWN_REQUEST_ERROR_NAME = "PrismaClientKnownRequestError";

const isPrismaKnownRequestError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Error && error.name === PRISMA_KNOWN_REQUEST_ERROR_NAME;

const violationMessageIncludesConstraint = (message: unknown, constraintName: string): boolean =>
  typeof message === "string" && message.includes(`violates check constraint "${constraintName}"`);

export const isCheckConstraintViolation = (error: unknown, constraintName: string): boolean => {
  if (!isPrismaKnownRequestError(error)) return false;

  const driverCause = asRecord(asRecord(error.meta)?.driverAdapterError)?.cause;
  const record = asRecord(driverCause);
  if (record?.originalCode === POSTGRES_CHECK_VIOLATION_SQLSTATE) {
    return (
      violationMessageIncludesConstraint(record.message, constraintName) ||
      violationMessageIncludesConstraint(record.originalMessage, constraintName)
    );
  }

  return violationMessageIncludesConstraint(error.message, constraintName);
};

const DEADLOCK_RETRY_ATTEMPTS = 3;

export const runWithDeadlockRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isDeadlockError(error) || attempt >= DEADLOCK_RETRY_ATTEMPTS) throw error;
      await waitMs(computeBackoffDelayMs(attempt));
    }
  }
};
