import { createHash } from "node:crypto";

import { hoursToMilliseconds } from "date-fns/hoursToMilliseconds";
import { subHours } from "date-fns/subHours";

import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { runWithDeadlockRetry } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

const PROCESSING_STATUS_CODE = 0;
const COMPLETED_STATUS_CODE = 200;
const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;

export const IDEMPOTENCY_KEY_RETENTION_HOURS = 24;
export const IDEMPOTENCY_KEY_RETENTION_SWEEP_INTERVAL_MS = hoursToMilliseconds(1);
const RETENTION_DELETE_BATCH_SIZE = 1000;
const IDEMPOTENT_TRANSACTION_TIMEOUT_MS = 5_000;

type IdempotencyClaimKey = { userId: string; endpoint: string; key: string };

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const sortedEntries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
    return `{${sortedEntries
      .map(([entryKey, entryValue]) => `${JSON.stringify(entryKey)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
};

export const hashIdempotentRequest = (endpoint: string, requestBody: unknown): string =>
  createHash("sha256")
    .update(`${endpoint}:${stableStringify(requestBody)}`)
    .digest("hex");

const duplicateRequestError = () =>
  new AppError("DUPLICATE_REQUEST", "This request is already being processed.", CONFLICT_STATUS);

const keyReusedError = () =>
  new AppError(
    "IDEMPOTENCY_KEY_REUSED",
    "This request key was already used for a different request.",
    UNPROCESSABLE_STATUS,
  );

const claimKey = async (
  claimKeyFields: IdempotencyClaimKey,
  requestHash: string | null,
): Promise<boolean> => {
  const { count } = await prisma.requestIdempotency.createMany({
    data: [
      {
        ...claimKeyFields,
        requestHash,
        statusCode: PROCESSING_STATUS_CODE,
        responseBody: {},
      },
    ],
    skipDuplicates: true,
  });
  return count > 0;
};

const replayOrReject = async <T>(
  claimKeyFields: IdempotencyClaimKey,
  requestHash: string | null,
): Promise<T> => {
  const existing = await prisma.requestIdempotency.findUnique({
    where: { userId_endpoint_key: claimKeyFields },
  });
  if (!existing) throw duplicateRequestError();

  const isDifferentRequest =
    requestHash !== null && existing.requestHash !== null && existing.requestHash !== requestHash;
  if (isDifferentRequest) throw keyReusedError();

  if (existing.statusCode === PROCESSING_STATUS_CODE) throw duplicateRequestError();
  return existing.responseBody as T;
};

const releaseClaim = async (claimKeyFields: IdempotencyClaimKey): Promise<void> => {
  await prisma.requestIdempotency.deleteMany({
    where: { ...claimKeyFields, statusCode: PROCESSING_STATUS_CODE },
  });
};

export const withIdempotency = async <T>(
  userId: string,
  endpoint: string,
  key: string | undefined,
  handler: () => Promise<T>,
  requestBody?: unknown,
): Promise<T> => {
  if (!key) return handler();

  const claimKeyFields = { userId, endpoint, key };
  const requestHash =
    requestBody === undefined ? null : hashIdempotentRequest(endpoint, requestBody);

  const isClaimed = await claimKey(claimKeyFields, requestHash);
  if (!isClaimed) return replayOrReject<T>(claimKeyFields, requestHash);

  let result: T;
  try {
    result = await handler();
  } catch (error) {
    if (error instanceof AppError) await releaseClaim(claimKeyFields);
    throw error;
  }

  await prisma.requestIdempotency.update({
    where: { userId_endpoint_key: claimKeyFields },
    data: { statusCode: COMPLETED_STATUS_CODE, responseBody: result as Prisma.InputJsonValue },
  });
  return result;
};

export type IdempotentTransactionRequest = {
  userId: string;
  endpoint: string;
  key: string;
  requestBody: unknown;
};

export const withIdempotentTransaction = async <T>(
  { userId, endpoint, key, requestBody }: IdempotentTransactionRequest,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
  const claimKeyFields = { userId, endpoint, key };
  const requestHash = hashIdempotentRequest(endpoint, requestBody);

  const isClaimed = await claimKey(claimKeyFields, requestHash);
  if (!isClaimed) return replayOrReject<T>(claimKeyFields, requestHash);

  try {
    return await runWithDeadlockRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const result = await work(tx);
          await tx.requestIdempotency.update({
            where: { userId_endpoint_key: claimKeyFields },
            data: {
              statusCode: COMPLETED_STATUS_CODE,
              responseBody: result as Prisma.InputJsonValue,
            },
          });
          return result;
        },
        { timeout: IDEMPOTENT_TRANSACTION_TIMEOUT_MS },
      ),
    );
  } catch (error) {
    await releaseClaim(claimKeyFields);
    throw error;
  }
};

export const runIdempotencyKeyRetentionSweep = async (): Promise<{ deleted: number }> => {
  const cutoff = subHours(new Date(), IDEMPOTENCY_KEY_RETENTION_HOURS);
  let deleted = 0;

  for (;;) {
    const deletedInBatch = await prisma.$executeRaw`
      DELETE FROM "request_idempotency"
      WHERE "id" IN (
        SELECT "id" FROM "request_idempotency"
        WHERE "created_at" < ${cutoff}
        LIMIT ${RETENTION_DELETE_BATCH_SIZE}
      )`;
    deleted += deletedInBatch;
    if (deletedInBatch < RETENTION_DELETE_BATCH_SIZE) return { deleted };
  }
};
