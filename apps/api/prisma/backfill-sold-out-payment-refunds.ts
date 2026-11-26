import "../src/config/load-env.js";

import { refundSoldOutPaymentsMissingRefund } from "../src/modules/payments/payment.sold-out-backfill.js";
import { prisma } from "../src/shared/db/prisma.js";

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
  .finally(() => prisma.$disconnect());
