import { Prisma } from "#generated/prisma/client.js";

export const nameOrHandleSearch = (query: string): Prisma.Sql => {
  if (query.length === 0) return Prisma.empty;
  const pattern = `%${query}%`;
  return Prisma.sql`AND (u.name ILIKE ${pattern} OR u.handle ILIKE ${pattern})`;
};

export const toIso = (value: Date | null): string | null => value?.toISOString() ?? null;

export const readTotalCount = (rows: { total_count: bigint }[]): number => {
  const [first] = rows;
  return first ? Number(first.total_count) : 0;
};
