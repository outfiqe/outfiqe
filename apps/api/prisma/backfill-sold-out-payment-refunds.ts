import "../src/config/load-env.js";

import { closeImageProcessingQueues } from "@outfiqe/image-pipeline";

import { imageProcessingQueues } from "../src/modules/image-processing/image-processing.queue.js";
import { refundSoldOutPaymentsMissingRefund } from "../src/modules/payments/payment.sold-out-backfill.js";
import { prisma } from "../src/shared/db/prisma.js";
import { closeOutboxQueues } from "../src/shared/outbox/outbox.queues.js";
import { disconnectRedis } from "../src/shared/redis/redis.client.js";

const closeConnections = async () => {
  await Promise.all([closeOutboxQueues(), closeImageProcessingQueues(imageProcessingQueues)]);
  await Promise.all([prisma.$disconnect(), disconnectRedis()]);
};

refundSoldOutPaymentsMissingRefund()
  .then(({ scanned, refunded, failed }) => {
    process.stdout.write(
      `done: ${refunded} of ${scanned} sold-out payments refunded, ${failed} failed\n`,
    );
    if (failed > 0) process.exitCode = 1;
  })
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(closeConnections);
