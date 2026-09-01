import "../src/config/load-env.js";

import { prisma } from "../src/shared/db/prisma.js";
import { recomputeCrmCounters } from "../src/shared/utils/crm-counters.js";

export { recomputeCrmCounters as backfillCrmCounters };

async function main() {
  const updated = await recomputeCrmCounters();
  console.warn(`Backfilled CRM counters for ${updated} organization(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
