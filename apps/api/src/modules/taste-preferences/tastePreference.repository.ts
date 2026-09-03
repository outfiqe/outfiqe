import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";

import type { CategoryPopularity } from "./tastePreference.types.js";

export const tastePreferenceRepository = {
  async findForUser(userId: string): Promise<string[] | null> {
    const row = await prisma.tastePreference.findUnique({
      where: { userId },
      select: { categorySlugs: true },
    });
    return row?.categorySlugs ?? null;
  },

  async upsertForUser(userId: string, categorySlugs: string[]): Promise<void> {
    await prisma.tastePreference.upsert({
      where: { userId },
      create: { userId, categorySlugs },
      update: { categorySlugs },
    });
  },

  async deleteForUser(userId: string): Promise<void> {
    await prisma.tastePreference.deleteMany({ where: { userId } });
  },

  async listCategoryPopularity(): Promise<CategoryPopularity[]> {
    const rows = await prisma.$queryRaw<{ slug: string; userCount: number }[]>(Prisma.sql`
      SELECT chosen.slug AS slug, COUNT(*)::int AS "userCount"
      FROM taste_preferences tp, unnest(tp.category_slugs) AS chosen(slug)
      GROUP BY chosen.slug
      ORDER BY "userCount" DESC, chosen.slug ASC
    `);
    return rows;
  },
};
