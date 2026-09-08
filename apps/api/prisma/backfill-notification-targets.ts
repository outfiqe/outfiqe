import "../src/config/load-env.js";

import { resolveNotificationTarget } from "../src/modules/notifications/notification.targets.js";
import type { NotificationMetadata } from "../src/modules/notifications/notification.types.js";
import { prisma } from "../src/shared/db/prisma.js";

const BATCH_SIZE = 500;
const STAFF_REPLY_METADATA_MARKER = "recipientIsStaff";

const isDryRun = process.argv.includes("--dry-run");

const backfill = async (): Promise<void> => {
  let cursor: string | undefined;
  let processed = 0;
  let updated = 0;

  for (;;) {
    const rows = await prisma.notification.findMany({
      where: { targetPath: null },
      select: { id: true, type: true, entityId: true, metadata: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1]?.id;

    for (const row of rows) {
      processed += 1;
      const metadata = (row.metadata ?? {}) as NotificationMetadata & Record<string, unknown>;
      const target = resolveNotificationTarget({
        type: row.type,
        entityId: row.entityId,
        metadata,
        recipientIsStaff: metadata[STAFF_REPLY_METADATA_MARKER] === true,
      });
      if (!target) continue;

      if (!isDryRun) {
        await prisma.notification.update({
          where: { id: row.id },
          data: { targetSurface: target.surface, targetPath: target.path },
        });
      }
      updated += 1;
    }

    process.stdout.write(`processed ${processed}, resolved ${updated}\n`);
  }

  process.stdout.write(
    `${isDryRun ? "[dry-run] " : ""}done: ${updated} of ${processed} notifications got a target\n`,
  );
};

backfill()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
