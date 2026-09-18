import "../src/config/load-env.js";

import { ProductStatus, ThriftCondition } from "../src/generated/prisma/enums.js";
import { prisma } from "../src/shared/db/prisma.js";

const unsplashUrl = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

type ThriftSeed = {
  name: string;
  brandName: string;
  typeSlug: string;
  categorySlug: string;
  price: number;
  conditionRating: ThriftCondition;
  conditionNotes: string;
  status: ProductStatus;
  stock: number;
  photo: string;
};

const THRIFT_SEED: ThriftSeed[] = [
  {
    name: "Vintage Levi's Trucker Jacket",
    brandName: "Thamel Thrift Co.",
    typeSlug: "outerwear",
    categorySlug: "streetwear",
    price: 2200,
    conditionRating: ThriftCondition.LIKE_NEW,
    conditionNotes: "Barely worn, no visible flaws — button studs still crisp.",
    status: ProductStatus.APPROVED,
    stock: 1,
    photo: "1578102718171-ec1f91680562",
  },
  {
    name: "Pre-loved Cotton Daura",
    brandName: "Thamel Thrift Co.",
    typeSlug: "tops",
    categorySlug: "traditional",
    price: 1500,
    conditionRating: ThriftCondition.GOOD,
    conditionNotes: "Small fade near the collar from washing, otherwise great condition.",
    status: ProductStatus.APPROVED,
    stock: 1,
    photo: "1622598661631-3a46559a4817",
  },
  {
    name: "Secondhand Wool Cardigan",
    brandName: "Nepa Threads",
    typeSlug: "tops",
    categorySlug: "old-money",
    price: 1800,
    conditionRating: ThriftCondition.GOOD,
    conditionNotes: "One tiny pull on the left sleeve, barely noticeable when worn.",
    status: ProductStatus.APPROVED,
    stock: 1,
    photo: "1633769573304-90d2d44eef0c",
  },
  {
    name: "Thrifted High-Waist Mom Jeans",
    brandName: "Yeti Yard",
    typeSlug: "pants",
    categorySlug: "y2k",
    price: 1200,
    conditionRating: ThriftCondition.FAIR,
    conditionNotes: "Authentic vintage fade with light wear on the knees — adds to the character.",
    status: ProductStatus.APPROVED,
    stock: 1,
    photo: "1515886657613-9f3515b0c78f",
  },
  {
    name: "Pre-owned Corduroy Trousers",
    brandName: "Boudha Basics",
    typeSlug: "pants",
    categorySlug: "business-casual",
    price: 1600,
    conditionRating: ThriftCondition.LIKE_NEW,
    conditionNotes: "Worn once for a formal event, dry-cleaned and stored carefully.",
    status: ProductStatus.APPROVED,
    stock: 1,
    photo: "1632255658477-9ac8f313ea41",
  },
  {
    name: "Vintage Band Tee",
    brandName: "Thamel Thrift Co.",
    typeSlug: "tops",
    categorySlug: "streetwear",
    price: 900,
    conditionRating: ThriftCondition.GOOD,
    conditionNotes: "Soft, broken-in cotton with a small crack in the print, expected for its age.",
    status: ProductStatus.APPROVED,
    stock: 1,
    photo: "1534404483017-8743b4e935cd",
  },
  {
    name: "Pre-loved Denim Jacket",
    brandName: "Nepa Threads",
    typeSlug: "outerwear",
    categorySlug: "casual",
    price: 2400,
    conditionRating: ThriftCondition.GOOD,
    conditionNotes: "Classic wash, minor wear at the cuffs — the one unit already sold.",
    status: ProductStatus.APPROVED,
    stock: 0,
    photo: "1516762689617-e1cffcef479d",
  },
  {
    name: "Secondhand Linen Sundress",
    brandName: "Lalitpur Loom",
    typeSlug: "dresses",
    categorySlug: "casual",
    price: 2000,
    conditionRating: ThriftCondition.LIKE_NEW,
    conditionNotes: "Only tried on, tags removed but never worn out.",
    status: ProductStatus.PENDING,
    stock: 1,
    photo: "1525507119028-ed4c629a60a3",
  },
  {
    name: "Thrifted Bucket Hat",
    brandName: "Thamel Thrift Co.",
    typeSlug: "headwear",
    categorySlug: "streetwear",
    price: 500,
    conditionRating: ThriftCondition.FAIR,
    conditionNotes: "Visible sun fading on the brim, structurally solid.",
    status: ProductStatus.PENDING,
    stock: 1,
    photo: "1529399447871-731cff7f696b",
  },
];

async function main() {
  const brands = await prisma.brand.findMany({ select: { id: true, name: true } });
  const brandIdByName = new Map(brands.map((brand) => [brand.name, brand.id]));

  const types = await prisma.productType.findMany({ select: { id: true, slug: true } });
  const typeIdBySlug = new Map(types.map((type) => [type.slug, type.id]));

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));

  let created = 0;
  let skippedExisting = 0;
  let skippedMissingRef = 0;

  for (const seed of THRIFT_SEED) {
    const existing = await prisma.product.findFirst({
      where: { name: seed.name },
      select: { id: true },
    });
    if (existing) {
      skippedExisting += 1;
      continue;
    }

    const brandId = brandIdByName.get(seed.brandName);
    const productTypeId = typeIdBySlug.get(seed.typeSlug);
    const categoryId = categoryIdBySlug.get(seed.categorySlug);
    if (!brandId || !productTypeId || !categoryId) {
      console.warn(`Skipping "${seed.name}" — missing brand/type/category reference.`);
      skippedMissingRef += 1;
      continue;
    }

    const imageUrl = unsplashUrl(seed.photo);

    await prisma.product.create({
      data: {
        brandId,
        name: seed.name,
        price: seed.price,
        productTypeId,
        status: seed.status,
        isThrift: true,
        thriftConditionRating: seed.conditionRating,
        thriftConditionNotes: seed.conditionNotes,
        imageUrl,
        categories: { connect: { id: categoryId } },
        images: { create: [{ url: imageUrl, sortOrder: 0 }] },
        sizes: {
          create: [
            {
              label: "One size",
              stock: seed.stock,
              inStock: seed.stock > 0,
              sortOrder: 0,
            },
          ],
        },
      },
    });
    created += 1;
  }

  console.warn(
    `Seeded ${created} thrift listings (${skippedExisting} already existed, ${skippedMissingRef} skipped for a missing reference).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
