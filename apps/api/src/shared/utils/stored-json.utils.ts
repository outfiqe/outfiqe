import { z } from "zod";

import type { Prisma } from "#generated/prisma/client.js";

export const toStoredJson = (
  value: unknown,
  fallback: Prisma.InputJsonValue,
): Prisma.InputJsonValue => {
  const parsed = z.json().safeParse(value);
  return parsed.success && parsed.data !== null ? parsed.data : fallback;
};
