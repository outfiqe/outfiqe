import "../src/config/load-env.js";

import { PostLayout } from "../src/generated/prisma/enums.js";
import { prisma } from "../src/shared/db/prisma.js";

const LAYOUT_CYCLE: PostLayout[] = [
  PostLayout.PORTRAIT,
  PostLayout.PORTRAIT,
  PostLayout.SQUARE,
  PostLayout.PORTRAIT,
  PostLayout.TALL,
  PostLayout.PORTRAIT,
];

async function main() {
  const alreadyVaried = await prisma.creatorLook.count({
    where: { layout: { not: PostLayout.PORTRAIT } },
  });
  if (alreadyVaried > 0) {
    console.warn(`Skipping — ${alreadyVaried} post(s) already have a non-default layout.`);
    return;
  }

  const looks = await prisma.creatorLook.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const countByLayout: Record<PostLayout, number> = {
    PORTRAIT: 0,
    SQUARE: 0,
    TALL: 0,
  };

  for (const [index, look] of looks.entries()) {
    const layout = LAYOUT_CYCLE[index % LAYOUT_CYCLE.length]!;
    countByLayout[layout] += 1;
    if (layout === PostLayout.PORTRAIT) continue;

    await prisma.creatorLook.update({ where: { id: look.id }, data: { layout } });
  }

  console.warn(
    `Assigned layouts across ${looks.length} posts — ` +
      `${countByLayout.PORTRAIT} Portrait, ${countByLayout.SQUARE} Square, ${countByLayout.TALL} Tall.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
