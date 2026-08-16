import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

const PENDING_STATUS_CODE = 0;
const CONFLICT_STATUS = 409;

export const withIdempotency = async <T>(
  userId: string,
  endpoint: string,
  key: string | undefined,
  handler: () => Promise<T>,
): Promise<T> => {
  if (!key) return handler();

  const where = { userId_endpoint_key: { userId, endpoint, key } };

  const existing = await prisma.requestIdempotency.findUnique({ where });
  if (existing) {
    if (existing.statusCode === PENDING_STATUS_CODE) {
      throw new AppError(
        "DUPLICATE_REQUEST",
        "This request is already being processed.",
        CONFLICT_STATUS,
      );
    }
    return existing.responseBody as T;
  }

  try {
    await prisma.requestIdempotency.create({
      data: { userId, endpoint, key, statusCode: PENDING_STATUS_CODE, responseBody: {} },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "DUPLICATE_REQUEST",
        "This request is already being processed.",
        CONFLICT_STATUS,
      );
    }
    throw error;
  }

  const result = await handler();
  await prisma.requestIdempotency.update({
    where,
    data: { statusCode: 200, responseBody: result as Prisma.InputJsonValue },
  });
  return result;
};
