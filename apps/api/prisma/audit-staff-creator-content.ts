import "../src/config/load-env.js";

import { CreatorStatus, UserRole } from "../src/generated/prisma/enums.js";
import { prisma } from "../src/shared/db/prisma.js";

const audit = async (): Promise<void> => {
  const flaggedUsers = await prisma.user.findMany({
    where: {
      role: { not: UserRole.CUSTOMER },
      OR: [{ isCreator: true }, { creatorStatus: { not: CreatorStatus.NONE } }],
    },
    select: {
      id: true,
      email: true,
      handle: true,
      role: true,
      isCreator: true,
      creatorStatus: true,
      creatorApprovedAt: true,
    },
  });

  if (flaggedUsers.length === 0) {
    process.stdout.write("No staff/brand accounts carry creator status. Nothing to remediate.\n");
    return;
  }

  process.stdout.write(
    `Found ${flaggedUsers.length} staff/brand account(s) with creator status:\n\n`,
  );

  for (const user of flaggedUsers) {
    const [lookCount, commentCount, likeCount, saveCount] = await Promise.all([
      prisma.creatorLook.count({ where: { creatorId: user.id } }),
      prisma.creatorLookComment.count({ where: { userId: user.id } }),
      prisma.creatorLookLike.count({ where: { userId: user.id } }),
      prisma.creatorLookSave.count({ where: { userId: user.id } }),
    ]);

    process.stdout.write(
      [
        `- ${user.email} (${user.handle ?? "no handle"}) [${user.id}]`,
        `  role=${user.role} isCreator=${user.isCreator} creatorStatus=${user.creatorStatus}` +
          ` approvedAt=${user.creatorApprovedAt?.toISOString() ?? "n/a"}`,
        `  looks=${lookCount} comments=${commentCount} likes=${likeCount} saves=${saveCount}`,
        "",
      ].join("\n"),
    );
  }

  process.stdout.write(
    "This is a read-only report. No rows were changed. Decide remediation per §6.6 of the\n" +
      "content-moderation plan: reset the flagged user(s) in a reviewed follow-up migration, and\n" +
      "route any of their existing looks/comments/likes/saves through the content-reports queue\n" +
      "or direct admin-delete for a human decision, rather than a bulk delete.\n",
  );
};

audit()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
