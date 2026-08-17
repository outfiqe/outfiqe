import { prisma } from "../src/shared/db/prisma.js";

const PRESERVED_TABLES = new Set(["users", "refresh_tokens", "_prisma_migrations"]);

async function main() {
  const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `select tablename from pg_tables where schemaname = 'public'`,
  );

  const tablesToPrune = tables
    .map((table) => table.tablename)
    .filter((tablename) => !PRESERVED_TABLES.has(tablename));

  if (tablesToPrune.length === 0) {
    console.warn("No tables to prune.");
    return;
  }

  const quotedTables = tablesToPrune.map((tablename) => `"${tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`truncate table ${quotedTables} restart identity cascade`);

  console.warn(`Pruned ${tablesToPrune.length} tables: ${tablesToPrune.join(", ")}`);
  console.warn(`Preserved: ${[...PRESERVED_TABLES].join(", ")}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
