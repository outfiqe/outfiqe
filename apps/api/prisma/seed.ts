import { prisma } from "../src/shared/db/prisma.js";

import { hashPassword } from "#lib/password.utils.js";
import { CreatorStatus, ProductStatus } from "../src/generated/prisma/enums.js";

const CREATOR_NAMES = [
  "Sabin Shrestha",
  "Anisha Gurung",
  "Bibek Thapa",
  "Prakriti Karki",
  "Rojina Magar",
  "Sujan Lama",
];

const LOOK_CAPTIONS = [
  "Layering for Kathmandu winters",
  "Thamel street style today",
  "Old-money fit for a brunch",
  "Streetwear pulled together in ten minutes",
  "Traditional pieces, modern styling",
  "Minimal fit, maximum comfort",
  "Y2K revival for the weekend",
  "Formal enough for the office",
];

const LOOK_COUNT = 24;
const MIN_TAGGED_PRODUCTS = 1;
const MAX_TAGGED_PRODUCTS = 3;

async function seedDemoUser() {
  const email = "demo@example.com";

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo User",
      phone: "+9824035436",
      passwordHash: await hashPassword("demo-password-123"),
    },
  });

  console.log(`Seeded user: ${email}`);
}

const shuffledSample = <T>(items: T[], count: number): T[] =>
  [...items].sort(() => Math.random() - 0.5).slice(0, count);

async function seedCreatorLooks() {
  const approvedProducts = await prisma.product.findMany({
    where: { status: ProductStatus.APPROVED },
    select: { id: true },
  });

  if (approvedProducts.length === 0) {
    console.log("No approved products yet — skipping creator look seed.");
    return;
  }

  const creators = await Promise.all(
    CREATOR_NAMES.map(async (name, index) =>
      prisma.user.upsert({
        where: { email: `creator${index + 1}@example.com` },
        update: { isCreator: true, creatorStatus: CreatorStatus.APPROVED },
        create: {
          email: `creator${index + 1}@example.com`,
          name,
          phone: `+9779810${String(index).padStart(5, "0")}`,
          passwordHash: await hashPassword("demo-password-123"),
          isCreator: true,
          creatorStatus: CreatorStatus.APPROVED,
        },
      }),
    ),
  );

  const existingLooks = await prisma.creatorLook.count();
  if (existingLooks > 0) {
    console.log(`Creator looks already seeded (${existingLooks}) — skipping.`);
    return;
  }

  for (let i = 0; i < LOOK_COUNT; i++) {
    const creator = creators[i % creators.length];
    const tagCount = MIN_TAGGED_PRODUCTS + Math.floor(Math.random() * MAX_TAGGED_PRODUCTS);
    const productIds = shuffledSample(approvedProducts, tagCount).map((product) => product.id);

    await prisma.creatorLook.create({
      data: {
        creatorId: creator.id,
        imageUrl: `https://picsum.photos/seed/outfiqe-look-${i}/600/750`,
        caption: LOOK_CAPTIONS[i % LOOK_CAPTIONS.length],
        taggedProducts: { create: productIds.map((productId) => ({ productId })) },
      },
    });
  }

  console.log(`Seeded ${LOOK_COUNT} creator looks across ${creators.length} creators`);
}

async function main() {
  await seedDemoUser();
  await seedCreatorLooks();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
