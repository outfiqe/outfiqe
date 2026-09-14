import "../src/config/load-env.js";

import { CreatorStatus, UserRole } from "../src/generated/prisma/enums.js";
import { prisma } from "../src/shared/db/prisma.js";

const remediate = async (): Promise<void> => {
  const flaggedUsers = await prisma.user.findMany({
    where: {
      role: { not: UserRole.CUSTOMER },
      OR: [{ isCreator: true }, { creatorStatus: { not: CreatorStatus.NONE } }],
    },
    select: { id: true, email: true, handle: true },
  });

  if (flaggedUsers.length === 0) {
    process.stdout.write("No staff/brand accounts carry creator status. Nothing to reset.\n");
    return;
  }

  let reset = 0;
  let skipped = 0;

  for (const user of flaggedUsers) {
    const [lookCount, commentCount, likeCount, saveCount] = await Promise.all([
      prisma.creatorLook.count({ where: { creatorId: user.id } }),
      prisma.creatorLookComment.count({ where: { userId: user.id } }),
      prisma.creatorLookLike.count({ where: { userId: user.id } }),
      prisma.creatorLookSave.count({ where: { userId: user.id } }),
    ]);
    const hasContent = lookCount + commentCount + likeCount + saveCount > 0;

    if (hasContent) {
      skipped += 1;
      process.stdout.write(
        `SKIPPED ${user.email} (${user.handle ?? "no handle"}) [${user.id}] — has content ` +
          `(looks=${lookCount} comments=${commentCount} likes=${likeCount} saves=${saveCount}). ` +
          "Route this content through the content-reports queue or direct admin-delete first, " +
          "then re-run this script.\n",
      );
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { creatorStatus: CreatorStatus.NONE, isCreator: false, creatorApprovedAt: null },
    });
    reset += 1;
    process.stdout.write(`RESET ${user.email} (${user.handle ?? "no handle"}) [${user.id}]\n`);
  }

  process.stdout.write(`\nDone: ${reset} reset, ${skipped} skipped (content still pending).\n`);
};

remediate()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
