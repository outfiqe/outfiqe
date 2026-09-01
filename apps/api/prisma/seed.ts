import { readFileSync } from "node:fs";

import { slugifyHandle } from "#lib/handle.utils.js";
import { hashPassword } from "#lib/password.utils.js";

import { IS_PROD } from "../src/config/app-env.js";
import {
  AchievementRequirementType,
  BadgeCategory,
  BadgeRarity,
  BankType,
  CategoryStatus,
  CollectionStatus,
  CreatorLeaderboardCategory,
  CreatorStatus,
  FollowTargetType,
  HeroSlideStatus,
  ProductStatus,
  ProductType,
  UserRole,
  XpActivityType,
} from "../src/generated/prisma/enums.js";
import { prisma } from "../src/shared/db/prisma.js";
import { seedCrmAccess } from "./seed-crm.js";

type NepalBankSeedRow = { code: string; name: string; type: keyof typeof BankType };

const NEPAL_BANKS: NepalBankSeedRow[] = JSON.parse(
  readFileSync(new URL("./seed-data/nepal-banks.json", import.meta.url), "utf8"),
);

const CREATOR_NAMES = [
  "Sabin Shrestha",
  "Anisha Gurung",
  "Bibek Thapa",
  "Prakriti Karki",
  "Rojina Magar",
  "Sujan Lama",
];

const CREATOR_HEIGHTS_CM = [178, 163, 183, 160, 168, 175];
const CREATOR_SIZES_WORN = ["M", "S", "L", "XS", "S", "M"];

const SHOPPER_NAMES = ["Nirajan Bhattarai", "Sristi Rai", "Aashish Poudel", "Manisha Adhikari"];

const LOOK_CAPTIONS = [
  "Layering for Kathmandu winters #winterlayers #madeinnepal",
  "Thamel street style today #streetstyle #ktmthrift",
  "Old-money fit for a brunch #oldmoney",
  "Streetwear pulled together in ten minutes #streetstyle",
  "Traditional pieces, modern styling #dhaka #madeinnepal",
  "Minimal fit, maximum comfort #minimalfit",
  "Y2K revival for the weekend #y2k",
  "Formal enough for the office #dashainfit #madeinnepal",
];

const COMMENT_BODIES = [
  "This is so good, need this fit.",
  "Where's the top from?",
  "Kathmandu weather approved fit.",
  "Saving this for Dashain.",
  "The styling on this is unreal.",
];

const LOOK_COUNT = 24;
const MIN_TAGGED_PRODUCTS = 1;
const MAX_TAGGED_PRODUCTS = 3;
const MIN_FOLLOWS_PER_USER = 2;
const MAX_FOLLOWS_PER_USER = 4;

const unsplashUrl = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

const STREETWEAR_PHOTOS = [
  "1578102718171-ec1f91680562",
  "1624353656309-8be1a6c457be",
  "1534404483017-8743b4e935cd",
  "1529399447871-731cff7f696b",
  "1708242355178-d8c929b01a9d",
];
const FORMAL_PHOTOS = [
  "1632255658477-9ac8f313ea41",
  "1629272039203-7d76fdaf1324",
  "1763739528420-bdc297ff4ec7",
  "1772301685774-a4f0e81e032e",
  "1763550662603-78aa2f2033bf",
];
const TRADITIONAL_PHOTOS = [
  "1622598661631-3a46559a4817",
  "1763733595166-41745662d1a7",
  "1766763846257-bcff4f97f79b",
  "1766763846459-67b2fe6b661c",
  "1766763846239-bfea22785d03",
];
const CASUAL_PHOTOS = [
  "1525507119028-ed4c629a60a3",
  "1516762689617-e1cffcef479d",
  "1544441893-675973e31985",
  "1467043237213-65f2da53396f",
  "1479064555552-3ef4979f8908",
];
const MINIMAL_PHOTOS = [
  "1551232864-3f0890e580d9",
  "1621341103818-01dada8c6ef8",
  "1653875842174-429c1b467548",
  "1556905055-8f358a7a47b2",
  "1627130697816-4d71dbfe6a5b",
];
const Y2K_PHOTOS = [
  "1515886657613-9f3515b0c78f",
  "1626781309887-cdfb9f258c64",
  "1576188973526-0e5d7047b0cf",
  "1590159983013-d4ff5fc71c1d",
  "1730328300200-8ef19dc04ce1",
];
const OLD_MONEY_PHOTOS = [
  "1633769573304-90d2d44eef0c",
  "1624983757883-6d3a17e8b964",
  "1762148039826-06811e4d4d99",
  "1629337888154-c535ef8cad9d",
  "1668086682634-726157bfdece",
];

const LOOK_CAPTION_PHOTO_POOLS = [
  CASUAL_PHOTOS,
  STREETWEAR_PHOTOS,
  OLD_MONEY_PHOTOS,
  STREETWEAR_PHOTOS,
  TRADITIONAL_PHOTOS,
  MINIMAL_PHOTOS,
  Y2K_PHOTOS,
  FORMAL_PHOTOS,
];

const lookPhotoUrl = (lookIndex: number): string => {
  const captionIndex = lookIndex % LOOK_CAPTIONS.length;
  const pool = LOOK_CAPTION_PHOTO_POOLS[captionIndex];
  const cycle = Math.floor(lookIndex / LOOK_CAPTIONS.length);
  return unsplashUrl(pool[cycle % pool.length]);
};

const shuffledSample = <T>(items: T[], count: number): T[] =>
  [...items].sort(() => Math.random() - 0.5).slice(0, count);

async function seedDemoUser() {
  const email = "demo@example.com";

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo User",
      handle: slugifyHandle("Demo User"),
      phone: "+9824035436",
      passwordHash: await hashPassword("demo-password-123"),
    },
  });
}

async function seedShoppers() {
  return Promise.all(
    SHOPPER_NAMES.map(async (name, index) =>
      prisma.user.upsert({
        where: { email: `shopper${index + 1}@example.com` },
        update: {},
        create: {
          email: `shopper${index + 1}@example.com`,
          name,
          handle: `${slugifyHandle(name)}${index}`,
          phone: `+9779820${String(index).padStart(5, "0")}`,
          passwordHash: await hashPassword("demo-password-123"),
        },
      }),
    ),
  );
}

async function seedCreators() {
  return Promise.all(
    CREATOR_NAMES.map(async (name, index) =>
      prisma.user.upsert({
        where: { email: `creator${index + 1}@example.com` },
        update: {
          isCreator: true,
          creatorStatus: CreatorStatus.APPROVED,
          heightCm: CREATOR_HEIGHTS_CM[index],
          showHeight: true,
        },
        create: {
          email: `creator${index + 1}@example.com`,
          name,
          handle: `${slugifyHandle(name)}${index}`,
          phone: `+9779810${String(index).padStart(5, "0")}`,
          passwordHash: await hashPassword("demo-password-123"),
          isCreator: true,
          creatorStatus: CreatorStatus.APPROVED,
          heightCm: CREATOR_HEIGHTS_CM[index],
          showHeight: true,
        },
      }),
    ),
  );
}

async function seedCreatorLooks(creators: { id: string }[]) {
  const approvedProducts = await prisma.product.findMany({
    where: { status: ProductStatus.APPROVED },
    select: { id: true },
  });

  if (approvedProducts.length === 0) return;

  const existingLooks = await prisma.creatorLook.count();
  if (existingLooks > 0) return;

  for (let i = 0; i < LOOK_COUNT; i++) {
    const creatorIndex = i % creators.length;
    const creator = creators[creatorIndex];
    const sizeWorn = CREATOR_SIZES_WORN[creatorIndex % CREATOR_SIZES_WORN.length];
    const tagCount = MIN_TAGGED_PRODUCTS + Math.floor(Math.random() * MAX_TAGGED_PRODUCTS);
    const productIds = shuffledSample(approvedProducts, tagCount).map((product) => product.id);

    await prisma.creatorLook.create({
      data: {
        creatorId: creator.id,
        imageUrl: lookPhotoUrl(i),
        caption: LOOK_CAPTIONS[i % LOOK_CAPTIONS.length],
        taggedProducts: { create: productIds.map((productId) => ({ productId, sizeWorn })) },
      },
    });
  }
}

const captionBase = (caption: string): string => caption.replace(/\s*#\w+/g, "").trim();

const LOOK_CAPTION_BASES = LOOK_CAPTIONS.map(captionBase);

async function seedCreatorLookImages() {
  const looks = await prisma.creatorLook.findMany({ select: { id: true, caption: true } });
  let updated = 0;

  for (const look of looks) {
    const captionIndex = LOOK_CAPTION_BASES.indexOf(captionBase(look.caption ?? ""));
    const pool = captionIndex === -1 ? CASUAL_PHOTOS : LOOK_CAPTION_PHOTO_POOLS[captionIndex];
    const imageUrl = unsplashUrl(pool[updated % pool.length]);

    await prisma.creatorLook.update({ where: { id: look.id }, data: { imageUrl } });
    updated++;
  }
}

async function seedHashtags() {
  const existing = await prisma.creatorLookHashtag.count();
  if (existing > 0) return;

  const looks = await prisma.creatorLook.findMany({ select: { id: true, caption: true } });

  for (const look of looks) {
    const tags = [...new Set((look.caption?.match(/#\w+/g) ?? []).map((tag) => tag.slice(1)))];
    if (tags.length === 0) continue;

    await prisma.creatorLookHashtag.createMany({
      data: tags.map((tag) => ({ creatorLookId: look.id, tag })),
    });
  }
}

async function seedFollows(actors: { id: string }[]) {
  const existing = await prisma.follow.count({ where: { followingType: FollowTargetType.USER } });
  if (existing > 0) return;

  for (const actor of actors) {
    const others = actors.filter((user) => user.id !== actor.id);
    const followCount = MIN_FOLLOWS_PER_USER + Math.floor(Math.random() * MAX_FOLLOWS_PER_USER);
    const targets = shuffledSample(others, Math.min(followCount, others.length));

    for (const target of targets) {
      await prisma.follow.create({
        data: {
          followerId: actor.id,
          followingType: FollowTargetType.USER,
          followingId: target.id,
        },
      });
      await prisma.user.update({
        where: { id: target.id },
        data: { followerCount: { increment: 1 } },
      });
      await prisma.user.update({
        where: { id: actor.id },
        data: { followingCount: { increment: 1 } },
      });
    }
  }
}

async function seedEngagement(actors: { id: string }[]) {
  const looks = await prisma.creatorLook.findMany({ select: { id: true } });
  if (looks.length === 0) return;

  const existingLikes = await prisma.creatorLookLike.count();
  if (existingLikes === 0) {
    for (const look of looks) {
      const likers = shuffledSample(
        actors,
        Math.min(actors.length, 3 + Math.floor(Math.random() * 5)),
      );
      for (const liker of likers) {
        await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: liker.id } });
      }
      await prisma.creatorLook.update({
        where: { id: look.id },
        data: { likeCount: likers.length },
      });
    }
  }

  const existingSaves = await prisma.creatorLookSave.count();
  if (existingSaves === 0) {
    for (const look of looks) {
      const savers = shuffledSample(
        actors,
        Math.min(actors.length, 1 + Math.floor(Math.random() * 3)),
      );
      for (const saver of savers) {
        await prisma.creatorLookSave.create({ data: { creatorLookId: look.id, userId: saver.id } });
      }
      await prisma.creatorLook.update({
        where: { id: look.id },
        data: { saveCount: savers.length },
      });
    }
  }

  const existingComments = await prisma.creatorLookComment.count();
  if (existingComments === 0) {
    for (const look of looks) {
      const commenters = shuffledSample(
        actors,
        Math.min(actors.length, 1 + Math.floor(Math.random() * 3)),
      );
      for (const commenter of commenters) {
        await prisma.creatorLookComment.create({
          data: {
            creatorLookId: look.id,
            userId: commenter.id,
            body: COMMENT_BODIES[Math.floor(Math.random() * COMMENT_BODIES.length)],
          },
        });
      }
      await prisma.creatorLook.update({
        where: { id: look.id },
        data: { commentCount: commenters.length },
      });
    }
  }
}

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];
const DEFAULT_SIZE_STOCK = 12;

async function seedProductSizes() {
  const existing = await prisma.productSize.count();
  if (existing > 0) return;

  const products = await prisma.product.findMany({ select: { id: true } });
  if (products.length === 0) return;

  for (const [index, product] of products.entries()) {
    const soldOutIndex = index % DEFAULT_SIZES.length;
    await prisma.productSize.createMany({
      data: DEFAULT_SIZES.map((label, i) => ({
        productId: product.id,
        label,
        inStock: i !== soldOutIndex,
        stock: i === soldOutIndex ? 0 : DEFAULT_SIZE_STOCK,
        sortOrder: i,
      })),
    });
  }
}

// Illustrative starting tiers — admin-editable afterwards, not hardcoded
// logic. A sold item's price is looked up against these bands to find the
// creator's fixed commission for that sale (see CommissionTier).
const DEFAULT_COMMISSION_TIERS = [
  { minPrice: 0, maxPrice: 1499, amount: 10 },
  { minPrice: 1500, maxPrice: 1999, amount: 20 },
  { minPrice: 2000, maxPrice: 2999, amount: 30 },
  { minPrice: 3000, maxPrice: 3999, amount: 40 },
  { minPrice: 4000, maxPrice: 4999, amount: 50 },
  { minPrice: 5000, maxPrice: null, amount: 60 },
];

async function seedCommissionTiers() {
  const existing = await prisma.commissionTier.count();
  if (existing > 0) return;

  await prisma.commissionTier.createMany({
    data: DEFAULT_COMMISSION_TIERS.map((tier, index) => ({ ...tier, sortOrder: index })),
  });
}

async function seedNepalBanks() {
  await Promise.all(
    NEPAL_BANKS.map((bank) =>
      prisma.nepalBank.upsert({
        where: { code: bank.code },
        update: { name: bank.name, type: BankType[bank.type] },
        create: { code: bank.code, name: bank.name, type: BankType[bank.type] },
      }),
    ),
  );
}

const BASIS_POINTS_PER_PERCENT = 100;

const DEFAULT_PLATFORM_COMMISSION_TIERS = [
  { minPrice: 0, maxPrice: 1_000, feeType: "FLAT", flatAmount: 30 },
  { minPrice: 1_000, maxPrice: 2_000, feeType: "PERCENT", ratePercent: 5 },
  { minPrice: 2_000, maxPrice: 3_000, feeType: "PERCENT", ratePercent: 4 },
  { minPrice: 3_000, maxPrice: 5_000, feeType: "PERCENT", ratePercent: 3.5 },
  { minPrice: 5_000, maxPrice: null, feeType: "PERCENT", ratePercent: 3 },
] as const;

const DEFAULT_GATEWAY_FEE_RATE_PERCENT: Record<"ESEWA" | "KHALTI", number> = {
  ESEWA: 2,
  KHALTI: 2,
};

async function seedPlatformCommissionRule() {
  const existing = await prisma.platformCommissionRule.count();
  if (existing > 0) return;

  const admin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
  if (!admin) {
    console.warn("Skipping PlatformCommissionRule seed — no ADMIN user exists yet.");
    return;
  }

  await prisma.platformCommissionRule.create({
    data: {
      isActive: true,
      updatedById: admin.id,
      tiers: {
        create: DEFAULT_PLATFORM_COMMISSION_TIERS.map((tier, index) => ({
          minPrice: tier.minPrice,
          maxPrice: tier.maxPrice,
          feeType: tier.feeType,
          flatAmount: tier.feeType === "FLAT" ? tier.flatAmount : null,
          ratePercentBasisPoints:
            tier.feeType === "PERCENT" ? tier.ratePercent * BASIS_POINTS_PER_PERCENT : null,
          sortOrder: index,
        })),
      },
    },
  });
}

async function seedGatewayFeeRates() {
  const existing = await prisma.gatewayFeeRate.count();
  if (existing > 0) return;

  const admin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
  if (!admin) {
    console.warn("Skipping GatewayFeeRate seed — no ADMIN user exists yet.");
    return;
  }

  for (const paymentMethod of ["ESEWA", "KHALTI"] as const) {
    await prisma.gatewayFeeRate.create({
      data: {
        paymentMethod,
        ratePercentBasisPoints:
          DEFAULT_GATEWAY_FEE_RATE_PERCENT[paymentMethod] * BASIS_POINTS_PER_PERCENT,
        isActive: true,
        updatedById: admin.id,
      },
    });
  }
}

const TROUSERS_PHOTOS = [
  "1767631338127-8cd80ee2f9df",
  "1778865576128-77027a3cb354",
  "1769467304164-deadf943e1eb",
  "1769467304184-07ba20979243",
];
const TSHIRT_PHOTOS = [
  "1775979654476-89575df179bd",
  "1655141559812-42f8c1e8942d",
  "1775817104298-522393e1d72b",
  "1763403063428-10184adc7be3",
];
const CARGO_PHOTOS = [
  "1594633312681-425c7b97ccd1",
  "1548883354-7622d03aca27",
  "1584302052177-2e90841dad6a",
  "1649850874075-49e014357b9d",
];
const BUCKET_HAT_PHOTOS = [
  "1648422204972-4278784a9863",
  "1679324351719-f23312611c50",
  "1593460832239-072261224f29",
  "1624518681328-bc59eefa1ce4",
];
const BOMBER_PHOTOS = [
  "1591047139829-d91aecb6caea",
  "1624548140129-74786c5f1279",
  "1602525582399-7ef5f604ff7e",
  "1530862994178-a0cec9eb5388",
];

const IMAGES_PER_PRODUCT = 2;

async function seedProductImages() {
  const products = await prisma.product.findMany({ select: { id: true, name: true } });

  for (const product of products) {
    const pool = PRODUCT_IMAGE_POOLS[product.name];
    if (!pool) continue;

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    const photos = shuffledSample(pool, Math.min(IMAGES_PER_PRODUCT, pool.length));

    await prisma.productImage.createMany({
      data: photos.map((id, index) => ({
        productId: product.id,
        url: unsplashUrl(id),
        sortOrder: index,
      })),
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl: unsplashUrl(photos[0]) },
    });
  }
}

async function seedBrandRatings() {
  const brands = await prisma.brand.findMany({ where: { rating: null }, select: { id: true } });
  if (brands.length === 0) return;

  for (const brand of brands) {
    const rating = Math.round((3.8 + Math.random() * 1.2) * 10) / 10;
    await prisma.brand.update({ where: { id: brand.id }, data: { rating } });
  }
}

async function seedBrandFollows(actors: { id: string }[]) {
  const brands = await prisma.brand.findMany({ select: { id: true } });
  if (brands.length === 0) return;

  const existing = await prisma.follow.count({ where: { followingType: FollowTargetType.BRAND } });
  if (existing > 0) return;

  for (const brand of brands) {
    const followers = shuffledSample(
      actors,
      Math.min(
        actors.length,
        MIN_FOLLOWS_PER_USER + Math.floor(Math.random() * MAX_FOLLOWS_PER_USER),
      ),
    );
    for (const follower of followers) {
      await prisma.follow.create({
        data: {
          followerId: follower.id,
          followingType: FollowTargetType.BRAND,
          followingId: brand.id,
        },
      });
      await prisma.brand.update({
        where: { id: brand.id },
        data: { followerCount: { increment: 1 } },
      });
      await prisma.user.update({
        where: { id: follower.id },
        data: { followingCount: { increment: 1 } },
      });
    }
  }
}

async function seedWornByCounts() {
  const approvedProducts = await prisma.product.findMany({
    where: { status: ProductStatus.APPROVED },
    select: {
      id: true,
      taggedInLooks: {
        where: {
          creatorLook: { deletedAt: null, creator: { creatorStatus: CreatorStatus.APPROVED } },
        },
        select: { creatorLook: { select: { creatorId: true } } },
      },
    },
  });

  for (const product of approvedProducts) {
    const distinctCreators = new Set(product.taggedInLooks.map((tag) => tag.creatorLook.creatorId));
    await prisma.product.update({
      where: { id: product.id },
      data: { wornByCount: distinctCreators.size },
    });
  }
}

const DEFAULT_CATEGORIES = [
  { slug: "formal", name: "Formal", imageUrl: unsplashUrl(FORMAL_PHOTOS[0]) },
  { slug: "traditional", name: "Traditional", imageUrl: unsplashUrl(TRADITIONAL_PHOTOS[0]) },
  { slug: "streetwear", name: "Streetwear", imageUrl: unsplashUrl(STREETWEAR_PHOTOS[0]) },
  { slug: "casual", name: "Casual", imageUrl: unsplashUrl(CASUAL_PHOTOS[0]) },
  { slug: "minimal", name: "Minimal", imageUrl: unsplashUrl(MINIMAL_PHOTOS[0]) },
  { slug: "y2k", name: "Y2K", imageUrl: unsplashUrl(Y2K_PHOTOS[0]) },
  { slug: "old-money", name: "Old Money", imageUrl: unsplashUrl(OLD_MONEY_PHOTOS[0]) },
  { slug: "athleisure", name: "Athleisure", imageUrl: unsplashUrl(CASUAL_PHOTOS[1]) },
  {
    slug: "business-casual",
    name: "Business Casual",
    imageUrl: unsplashUrl(FORMAL_PHOTOS[1]),
  },
  { slug: "preppy", name: "Preppy", imageUrl: unsplashUrl(OLD_MONEY_PHOTOS[1]) },
  { slug: "loungewear", name: "Loungewear", imageUrl: unsplashUrl(MINIMAL_PHOTOS[1]) },
];

const seedCategories = async () => {
  const existing = await prisma.category.count();
  if (existing > 0) return;

  for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
    await prisma.category.create({
      data: { ...category, status: CategoryStatus.PUBLISHED, sortOrder: index },
    });
  }
};

const SEED_BRANDS = [
  {
    name: "Kastha Studio",
    contactName: "Aasha Maharjan",
    email: "hello@kastha.example.com",
    phone: "+9779800000101",
    instagram: "@kasthastudio",
  },
  {
    name: "Nepa Threads",
    contactName: "Bikash Shakya",
    email: "hello@nepathreads.example.com",
    phone: "+9779800000102",
    instagram: "@nepathreads",
  },
  {
    name: "Lalitpur Loom",
    contactName: "Sarita Manandhar",
    email: "hello@lalitpurloom.example.com",
    phone: "+9779800000103",
    instagram: "@lalitpurloom",
  },
  {
    name: "Aamo",
    contactName: "Kiran Tuladhar",
    email: "hello@aamo.example.com",
    phone: "+9779800000104",
    instagram: "@aamo",
  },
  {
    name: "Newa Atelier",
    contactName: "Sunita Rajbhandari",
    email: "hello@newaatelier.example.com",
    phone: "+9779800000105",
    instagram: "@newaatelier",
  },
  {
    name: "Thamel Thrift Co.",
    contactName: "Rabin Khadka",
    email: "hello@thamelthrift.example.com",
    phone: "+9779800000106",
    instagram: "@thamelthrift",
  },
  {
    name: "Boudha Basics",
    contactName: "Anmol Shrestha",
    email: "hello@boudhabasics.example.com",
    phone: "+9779800000107",
    instagram: "@boudhabasics",
  },
  {
    name: "Patan Polo Club",
    contactName: "Ujwala Joshi",
    email: "hello@patanpoloclub.example.com",
    phone: "+9779800000108",
    instagram: "@patanpoloclub",
  },
  {
    name: "Yeti Yard",
    contactName: "Dipesh Gurung",
    email: "hello@yetiyard.example.com",
    phone: "+9779800000109",
    instagram: "@yetiyard",
  },
  {
    name: "Ranipokhari Row",
    contactName: "Smriti Basnet",
    email: "hello@ranipokharirow.example.com",
    phone: "+9779800000110",
    instagram: "@ranipokharirow",
  },
];

const seedBrands = async () => {
  const existing = await prisma.brand.findMany();
  if (existing.length > 0) return existing;

  return Promise.all(SEED_BRANDS.map((brand) => prisma.brand.create({ data: brand })));
};

const SEED_PRODUCTS = [
  {
    name: "Oversized Graphic Tee",
    price: 1450,
    type: ProductType.TOPS,
    categorySlugs: ["streetwear", "casual"],
    brandIndex: 0,
    photoPool: TSHIRT_PHOTOS,
  },
  {
    name: "Cargo Pants",
    price: 2600,
    type: ProductType.PANTS,
    categorySlugs: ["streetwear", "casual"],
    brandIndex: 0,
    photoPool: CARGO_PHOTOS,
  },
  {
    name: "Wool Bomber Jacket",
    price: 5400,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["streetwear", "casual"],
    brandIndex: 0,
    photoPool: BOMBER_PHOTOS,
  },
  {
    name: "Bucket Hat",
    price: 950,
    type: ProductType.HEADWEAR,
    categorySlugs: ["streetwear"],
    brandIndex: 3,
    photoPool: BUCKET_HAT_PHOTOS,
  },
  {
    name: "Boxy Varsity Jacket",
    price: 4800,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["streetwear", "y2k"],
    brandIndex: 5,
    photoPool: BOMBER_PHOTOS,
  },
  {
    name: "Baggy Denim Jeans",
    price: 3100,
    type: ProductType.PANTS,
    categorySlugs: ["streetwear"],
    brandIndex: 5,
    photoPool: CARGO_PHOTOS,
  },
  {
    name: "Logo Print Hoodie",
    price: 2900,
    type: ProductType.TOPS,
    categorySlugs: ["streetwear", "casual"],
    brandIndex: 0,
    photoPool: STREETWEAR_PHOTOS,
  },
  {
    name: "Formal Pants",
    price: 3400,
    type: ProductType.PANTS,
    categorySlugs: ["formal", "business-casual"],
    brandIndex: 1,
    photoPool: FORMAL_PHOTOS,
  },
  {
    name: "Pleated Trousers",
    price: 3200,
    type: ProductType.PANTS,
    categorySlugs: ["formal"],
    brandIndex: 1,
    photoPool: TROUSERS_PHOTOS,
  },
  {
    name: "Slim Fit Dress Shirt",
    price: 2200,
    type: ProductType.TOPS,
    categorySlugs: ["formal", "business-casual"],
    brandIndex: 1,
    photoPool: FORMAL_PHOTOS,
  },
  {
    name: "Tailored Blazer",
    price: 6200,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["formal", "business-casual"],
    brandIndex: 9,
    photoPool: FORMAL_PHOTOS,
  },
  {
    name: "Charcoal Waistcoat",
    price: 2800,
    type: ProductType.TOPS,
    categorySlugs: ["formal"],
    brandIndex: 9,
    photoPool: FORMAL_PHOTOS,
  },
  {
    name: "Double-Breasted Overcoat",
    price: 7800,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["formal", "old-money"],
    brandIndex: 4,
    photoPool: FORMAL_PHOTOS,
  },
  {
    name: "Linen Kurta",
    price: 2800,
    type: ProductType.TOPS,
    categorySlugs: ["traditional"],
    brandIndex: 2,
    photoPool: TRADITIONAL_PHOTOS,
  },
  {
    name: "Daura Suruwal Set",
    price: 6500,
    type: ProductType.DRESSES,
    categorySlugs: ["traditional", "formal"],
    brandIndex: 2,
    photoPool: TRADITIONAL_PHOTOS,
  },
  {
    name: "Dhaka Print Vest",
    price: 1800,
    type: ProductType.TOPS,
    categorySlugs: ["traditional"],
    brandIndex: 4,
    photoPool: TRADITIONAL_PHOTOS,
  },
  {
    name: "Hand-Woven Shawl Wrap",
    price: 3600,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["traditional", "old-money"],
    brandIndex: 4,
    photoPool: TRADITIONAL_PHOTOS,
  },
  {
    name: "Embroidered Silk Kurta",
    price: 4200,
    type: ProductType.TOPS,
    categorySlugs: ["traditional", "formal"],
    brandIndex: 2,
    photoPool: TRADITIONAL_PHOTOS,
  },
  {
    name: "Nepali Topi",
    price: 650,
    type: ProductType.HEADWEAR,
    categorySlugs: ["traditional"],
    brandIndex: 2,
    photoPool: BUCKET_HAT_PHOTOS,
  },
  {
    name: "Handloom Cotton Dress",
    price: 3100,
    type: ProductType.DRESSES,
    categorySlugs: ["traditional", "minimal"],
    brandIndex: 2,
    photoPool: TRADITIONAL_PHOTOS,
  },
  {
    name: "Relaxed Fit Chinos",
    price: 2400,
    type: ProductType.PANTS,
    categorySlugs: ["casual", "business-casual"],
    brandIndex: 6,
    photoPool: CASUAL_PHOTOS,
  },
  {
    name: "Everyday Crewneck Sweater",
    price: 2100,
    type: ProductType.TOPS,
    categorySlugs: ["casual", "minimal"],
    brandIndex: 6,
    photoPool: CASUAL_PHOTOS,
  },
  {
    name: "Denim Overshirt",
    price: 2700,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["casual", "streetwear"],
    brandIndex: 0,
    photoPool: CASUAL_PHOTOS,
  },
  {
    name: "Cotton Poplin Shirt",
    price: 1900,
    type: ProductType.TOPS,
    categorySlugs: ["casual", "business-casual"],
    brandIndex: 6,
    photoPool: CASUAL_PHOTOS,
  },
  {
    name: "Weekend Jogger Pants",
    price: 1750,
    type: ProductType.PANTS,
    categorySlugs: ["casual", "athleisure"],
    brandIndex: 6,
    photoPool: CASUAL_PHOTOS,
  },
  {
    name: "Corduroy Trucker Jacket",
    price: 3900,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["casual", "streetwear"],
    brandIndex: 0,
    photoPool: CASUAL_PHOTOS,
  },
  {
    name: "Floral Wrap Dress",
    price: 2950,
    type: ProductType.DRESSES,
    categorySlugs: ["casual", "minimal"],
    brandIndex: 6,
    photoPool: CASUAL_PHOTOS,
  },
  {
    name: "Boxy Cotton Tee",
    price: 1200,
    type: ProductType.TOPS,
    categorySlugs: ["minimal", "casual"],
    brandIndex: 6,
    photoPool: MINIMAL_PHOTOS,
  },
  {
    name: "Straight Leg Trousers",
    price: 2900,
    type: ProductType.PANTS,
    categorySlugs: ["minimal", "business-casual"],
    brandIndex: 6,
    photoPool: MINIMAL_PHOTOS,
  },
  {
    name: "Structured Midi Dress",
    price: 3400,
    type: ProductType.DRESSES,
    categorySlugs: ["minimal"],
    brandIndex: 6,
    photoPool: MINIMAL_PHOTOS,
  },
  {
    name: "Seamless Rib Tank",
    price: 950,
    type: ProductType.TOPS,
    categorySlugs: ["minimal", "loungewear"],
    brandIndex: 6,
    photoPool: MINIMAL_PHOTOS,
  },
  {
    name: "Wide Leg Linen Pants",
    price: 2600,
    type: ProductType.PANTS,
    categorySlugs: ["minimal", "loungewear"],
    brandIndex: 6,
    photoPool: MINIMAL_PHOTOS,
  },
  {
    name: "Chunky Knit Beanie",
    price: 750,
    type: ProductType.HEADWEAR,
    categorySlugs: ["minimal", "casual"],
    brandIndex: 6,
    photoPool: MINIMAL_PHOTOS,
  },
  {
    name: "Low-Rise Cargo Skirt",
    price: 2300,
    type: ProductType.BOTTOMS,
    categorySlugs: ["y2k", "streetwear"],
    brandIndex: 5,
    photoPool: Y2K_PHOTOS,
  },
  {
    name: "Cropped Baby Tee",
    price: 1100,
    type: ProductType.TOPS,
    categorySlugs: ["y2k"],
    brandIndex: 5,
    photoPool: Y2K_PHOTOS,
  },
  {
    name: "Butterfly Print Top",
    price: 1350,
    type: ProductType.TOPS,
    categorySlugs: ["y2k"],
    brandIndex: 5,
    photoPool: Y2K_PHOTOS,
  },
  {
    name: "Denim Mini Skirt",
    price: 1950,
    type: ProductType.BOTTOMS,
    categorySlugs: ["y2k", "streetwear"],
    brandIndex: 5,
    photoPool: Y2K_PHOTOS,
  },
  {
    name: "Rhinestone Trucker Cap",
    price: 850,
    type: ProductType.HEADWEAR,
    categorySlugs: ["y2k", "streetwear"],
    brandIndex: 5,
    photoPool: Y2K_PHOTOS,
  },
  {
    name: "Cable Knit Sweater",
    price: 3800,
    type: ProductType.TOPS,
    categorySlugs: ["old-money", "preppy"],
    brandIndex: 7,
    photoPool: OLD_MONEY_PHOTOS,
  },
  {
    name: "Camel Wool Coat",
    price: 8500,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["old-money", "formal"],
    brandIndex: 4,
    photoPool: OLD_MONEY_PHOTOS,
  },
  {
    name: "Pleated Wool Skirt",
    price: 3200,
    type: ProductType.BOTTOMS,
    categorySlugs: ["old-money", "preppy"],
    brandIndex: 7,
    photoPool: OLD_MONEY_PHOTOS,
  },
  {
    name: "Quilted Vest",
    price: 3600,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["old-money", "preppy"],
    brandIndex: 7,
    photoPool: OLD_MONEY_PHOTOS,
  },
  {
    name: "Oxford Button-Down Shirt",
    price: 2600,
    type: ProductType.TOPS,
    categorySlugs: ["old-money", "preppy", "business-casual"],
    brandIndex: 7,
    photoPool: OLD_MONEY_PHOTOS,
  },
  {
    name: "Herringbone Blazer",
    price: 6800,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["old-money", "formal"],
    brandIndex: 4,
    photoPool: OLD_MONEY_PHOTOS,
  },
  {
    name: "Silk Slip Dress",
    price: 3800,
    type: ProductType.DRESSES,
    categorySlugs: ["old-money", "minimal"],
    brandIndex: 4,
    photoPool: OLD_MONEY_PHOTOS,
  },
  {
    name: "Pinstripe Trousers",
    price: 3500,
    type: ProductType.PANTS,
    categorySlugs: ["formal", "old-money"],
    brandIndex: 4,
    photoPool: TROUSERS_PHOTOS,
  },
  {
    name: "Performance Track Jacket",
    price: 3300,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["athleisure", "streetwear"],
    brandIndex: 8,
    photoPool: CASUAL_PHOTOS,
  },
  {
    name: "High-Waist Training Leggings",
    price: 1800,
    type: ProductType.BOTTOMS,
    categorySlugs: ["athleisure"],
    brandIndex: 8,
    photoPool: MINIMAL_PHOTOS,
  },
  {
    name: "Ribbed Sports Bra Top",
    price: 1200,
    type: ProductType.TOPS,
    categorySlugs: ["athleisure"],
    brandIndex: 8,
    photoPool: MINIMAL_PHOTOS,
  },
  {
    name: "Fleece Zip Hoodie",
    price: 2600,
    type: ProductType.TOPS,
    categorySlugs: ["athleisure", "casual"],
    brandIndex: 8,
    photoPool: CASUAL_PHOTOS,
  },
  {
    name: "Tapered Joggers",
    price: 2000,
    type: ProductType.PANTS,
    categorySlugs: ["athleisure", "casual"],
    brandIndex: 8,
    photoPool: CASUAL_PHOTOS,
  },
  {
    name: "Puffer Vest",
    price: 2450,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["athleisure", "streetwear"],
    brandIndex: 8,
    photoPool: BOMBER_PHOTOS,
  },
  {
    name: "Merino Half-Zip Sweater",
    price: 3100,
    type: ProductType.TOPS,
    categorySlugs: ["business-casual", "formal"],
    brandIndex: 9,
    photoPool: FORMAL_PHOTOS,
  },
  {
    name: "Stretch Wool Trousers",
    price: 3300,
    type: ProductType.PANTS,
    categorySlugs: ["business-casual", "formal"],
    brandIndex: 9,
    photoPool: TROUSERS_PHOTOS,
  },
  {
    name: "Structured Shirt Dress",
    price: 3500,
    type: ProductType.DRESSES,
    categorySlugs: ["business-casual", "minimal"],
    brandIndex: 1,
    photoPool: MINIMAL_PHOTOS,
  },
  {
    name: "Soft Blazer Jacket",
    price: 5200,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["business-casual", "formal"],
    brandIndex: 1,
    photoPool: FORMAL_PHOTOS,
  },
  {
    name: "Argyle Knit Vest",
    price: 2600,
    type: ProductType.TOPS,
    categorySlugs: ["preppy", "old-money"],
    brandIndex: 7,
    photoPool: OLD_MONEY_PHOTOS,
  },
  {
    name: "Pleated Tennis Skirt",
    price: 2100,
    type: ProductType.BOTTOMS,
    categorySlugs: ["preppy"],
    brandIndex: 7,
    photoPool: OLD_MONEY_PHOTOS,
  },
  {
    name: "Collared Polo Shirt",
    price: 1850,
    type: ProductType.TOPS,
    categorySlugs: ["preppy", "casual"],
    brandIndex: 7,
    photoPool: CASUAL_PHOTOS,
  },
  {
    name: "Varsity Letterman Jacket",
    price: 4600,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["preppy", "streetwear"],
    brandIndex: 7,
    photoPool: BOMBER_PHOTOS,
  },
  {
    name: "Waffle Knit Lounge Set",
    price: 2400,
    type: ProductType.DRESSES,
    categorySlugs: ["loungewear", "minimal"],
    brandIndex: 6,
    photoPool: MINIMAL_PHOTOS,
  },
  {
    name: "Brushed Cotton Joggers",
    price: 1650,
    type: ProductType.PANTS,
    categorySlugs: ["loungewear", "casual"],
    brandIndex: 6,
    photoPool: CASUAL_PHOTOS,
  },
  {
    name: "Oversized Sleep Shirt",
    price: 1400,
    type: ProductType.TOPS,
    categorySlugs: ["loungewear"],
    brandIndex: 6,
    photoPool: MINIMAL_PHOTOS,
  },
  {
    name: "Terry Cloth Robe Jacket",
    price: 2900,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["loungewear"],
    brandIndex: 6,
    photoPool: MINIMAL_PHOTOS,
  },
  {
    name: "Denim Trucker Jacket",
    price: 2750,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["streetwear", "casual"],
    brandIndex: 5,
    photoPool: CASUAL_PHOTOS,
  },
];

const PRODUCT_IMAGE_POOLS: Record<string, string[]> = Object.fromEntries(
  SEED_PRODUCTS.map((product) => [product.name, product.photoPool]),
);

const seedProducts = async (brands: { id: string }[]) => {
  const existing = await prisma.product.count();
  if (existing > 0) return;

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryIdBySlug = new Map(categories.map((category) => [category.slug, category.id]));

  for (const seedProduct of SEED_PRODUCTS) {
    await prisma.product.create({
      data: {
        brandId: brands[seedProduct.brandIndex].id,
        name: seedProduct.name,
        price: seedProduct.price,
        type: seedProduct.type,
        status: ProductStatus.APPROVED,
        categories: {
          connect: seedProduct.categorySlugs
            .map((slug) => categoryIdBySlug.get(slug))
            .filter((id): id is string => Boolean(id))
            .map((id) => ({ id })),
        },
      },
    });
  }
};

type SeedCollection = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  pick: (product: {
    id: string;
    categories: { slug: string }[];
    price: number;
    type: ProductType;
  }) => boolean;
};

const hasCategory = (product: { categories: { slug: string }[] }, slug: string): boolean =>
  product.categories.some((category) => category.slug === slug);

const SEED_COLLECTIONS: SeedCollection[] = [
  {
    name: "Dashain Edit '26",
    slug: "dashain-edit-26",
    description: "Daura suruwal, kurta sets and modern cuts styled as full looks for Dashain.",
    imageUrl: unsplashUrl(TRADITIONAL_PHOTOS[0]),
    pick: (product) => hasCategory(product, "traditional") || hasCategory(product, "formal"),
  },
  {
    name: "Under Rs. 3,000",
    slug: "under-3000",
    description: "Real pieces from Nepali brands, all under three thousand rupees.",
    imageUrl: unsplashUrl(CASUAL_PHOTOS[0]),
    pick: (product) => product.price < 3000,
  },
  {
    name: "Office Ready",
    slug: "office-ready",
    description: "Structured, put-together pieces that work from desk to dinner.",
    imageUrl: unsplashUrl(FORMAL_PHOTOS[0]),
    pick: (product) => hasCategory(product, "formal") || hasCategory(product, "business-casual"),
  },
  {
    name: "Weekend Fits",
    slug: "weekend-fits",
    description: "Easy, off-duty pieces for days with nowhere to be.",
    imageUrl: unsplashUrl(CASUAL_PHOTOS[1]),
    pick: (product) => hasCategory(product, "casual") || hasCategory(product, "streetwear"),
  },
  {
    name: "The Old Money Archive",
    slug: "old-money-archive",
    description: "Cable knits, camel coats and quiet-luxury tailoring for a heritage wardrobe.",
    imageUrl: unsplashUrl(OLD_MONEY_PHOTOS[0]),
    pick: (product) => hasCategory(product, "old-money") || hasCategory(product, "preppy"),
  },
  {
    name: "Y2K Revival",
    slug: "y2k-revival",
    description: "Low-rise cuts, butterfly prints and rhinestone trims straight off the 2000s.",
    imageUrl: unsplashUrl(Y2K_PHOTOS[0]),
    pick: (product) => hasCategory(product, "y2k"),
  },
  {
    name: "Monsoon Layers",
    slug: "monsoon-layers",
    description: "Jackets, coats and overshirts built for Kathmandu's unpredictable monsoon.",
    imageUrl: unsplashUrl(BOMBER_PHOTOS[0]),
    pick: (product) => product.type === ProductType.OUTERWEAR,
  },
  {
    name: "Athleisure & Lounge",
    slug: "athleisure-and-lounge",
    description: "Soft, stretch-first pieces for training days and slow mornings alike.",
    imageUrl: unsplashUrl(MINIMAL_PHOTOS[0]),
    pick: (product) => hasCategory(product, "athleisure") || hasCategory(product, "loungewear"),
  },
];

const COLLECTION_PRODUCT_LIMIT = 10;

const seedCollections = async () => {
  const existing = await prisma.collection.count();
  if (existing > 0) return;

  const approvedProducts = await prisma.product.findMany({
    where: { status: ProductStatus.APPROVED },
    select: { id: true, categories: { select: { slug: true } }, price: true, type: true },
  });

  if (approvedProducts.length === 0) return;

  for (const [index, collection] of SEED_COLLECTIONS.entries()) {
    const matches = approvedProducts.filter(collection.pick);
    const products = shuffledSample(
      matches.length > 0 ? matches : approvedProducts,
      COLLECTION_PRODUCT_LIMIT,
    );

    await prisma.collection.create({
      data: {
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        imageUrl: collection.imageUrl,
        status: CollectionStatus.PUBLISHED,
        sortOrder: index,
        products: {
          create: products.map((product, productIndex) => ({
            productId: product.id,
            sortOrder: productIndex,
          })),
        },
      },
    });
  }
};

const SEED_HERO_SLIDES = [
  {
    tag: "Collection 01: Festive",
    title: "Dashain\nEdit '26",
    description:
      "Daura suruwal, kurta sets and modern cuts from eleven Kathmandu labels. Styled as full looks, not loose items.",
    ctaLabel: "Explore collection",
    ctaHref: "/collections/dashain-edit-26",
    imageUrl: unsplashUrl(TRADITIONAL_PHOTOS[1]),
  },
  {
    tag: "Collection 02: Creators",
    title: "Shop the\nlooks you scroll",
    description:
      "Every outfit tagged by the Nepali creators who styled it. Tap a look, get the full fit.",
    ctaLabel: "See creator looks",
    ctaHref: "/explore",
    imageUrl: unsplashUrl(STREETWEAR_PHOTOS[1]),
  },
  {
    tag: "Collection 03: Just In",
    title: "New brands,\nfresh this week",
    description: "Five new Kathmandu labels just went live, all vetted and set up by our team.",
    ctaLabel: "Browse new brands",
    ctaHref: "/collections",
    imageUrl: unsplashUrl(CASUAL_PHOTOS[2]),
  },
];

const seedHeroSlides = async () => {
  const existing = await prisma.heroSlide.count();
  if (existing > 0) return;

  for (const [index, slide] of SEED_HERO_SLIDES.entries()) {
    await prisma.heroSlide.create({
      data: { ...slide, status: HeroSlideStatus.PUBLISHED, sortOrder: index },
    });
  }
};

const LEVEL_LADDER = [
  { level: 1, name: "Newcomer", requiredXp: 0 },
  { level: 2, name: "Fashion Explorer", requiredXp: 100 },
  { level: 3, name: "Style Seeker", requiredXp: 300 },
  { level: 4, name: "Trend Chaser", requiredXp: 750 },
  { level: 5, name: "Style Creator", requiredXp: 1500 },
  { level: 6, name: "Fashion Star", requiredXp: 3000 },
  { level: 7, name: "Fashion Icon", requiredXp: 6000 },
  { level: 8, name: "Fashion Legend", requiredXp: 10000 },
];

const seedLevels = async () => {
  for (const rung of LEVEL_LADDER) {
    await prisma.level.upsert({
      where: { level: rung.level },
      update: { name: rung.name, requiredXp: rung.requiredXp },
      create: rung,
    });
  }
};

// Illustrative starting XP economy (PRD spec 04) — admin-editable afterwards
// via ActivityXpConfig, not hardcoded logic. "Views"/"profile completion"
// have no defined tracking yet (see gamification plan gaps #2/#3) and are
// deliberately not seeded. ADMIN_ADJUSTMENT/FOLLOWER_MILESTONE have no fixed
// per-occurrence amount (manual entry / achievement-awarded respectively),
// so they carry no config row either.
const ACTIVITY_XP_CONFIG = [
  { activityType: XpActivityType.LOOK_CREATED, xpAmount: 10, dailyLimit: 100 },
  { activityType: XpActivityType.LOOK_LIKE_RECEIVED, xpAmount: 2, dailyLimit: 200 },
  { activityType: XpActivityType.LOOK_COMMENT_RECEIVED, xpAmount: 5, dailyLimit: 100 },
  { activityType: XpActivityType.LOOK_COMMENTED, xpAmount: 3, dailyLimit: 60 },
  { activityType: XpActivityType.LOOK_SAVED, xpAmount: 3, dailyLimit: 60 },
  { activityType: XpActivityType.USER_FOLLOWED, xpAmount: 2, maxPerEntity: 1 },
  { activityType: XpActivityType.PRODUCT_PURCHASED, xpAmount: 20 },
  { activityType: XpActivityType.SALE_GENERATED, xpAmount: 50 },
  { activityType: XpActivityType.PRODUCT_TAGGED, xpAmount: 10, dailyLimit: 100 },
];

const seedActivityXpConfig = async () => {
  for (const config of ACTIVITY_XP_CONFIG) {
    await prisma.activityXpConfig.upsert({
      where: { activityType: config.activityType },
      update: config,
      create: config,
    });
  }
};

const seedCreatorLeaderboardCategoryConfig = async () => {
  for (const category of Object.values(CreatorLeaderboardCategory)) {
    await prisma.creatorLeaderboardCategoryConfig.upsert({
      where: { category },
      update: {},
      create: { category, enabled: true },
    });
  }
};

type BadgeSeed = {
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  icon: string;
  shape: "circle" | "shield" | "star" | "diamond" | "hexagon";
  primaryColor: string;
  xpReward: number;
  requirementType: AchievementRequirementType;
  conditions: { metric: string; operator: "gte"; value: number }[];
  assignmentLimit?: number;
  isTitleEligible?: boolean;
};

// First slice of the spec 12 catalog (not all 40) — enough to exercise every
// rarity and category the badge system defines. requirementConfig metrics
// are read from the per-user stat snapshot the achievements engine builds
// (see achievements module, chunk 6) — not evaluated by this seed script.
const BADGE_SEED: BadgeSeed[] = [
  {
    name: "Fashion Newbie",
    description: "Welcome to Outfiqe — your journey starts here.",
    category: BadgeCategory.BEGINNER,
    rarity: BadgeRarity.COMMON,
    icon: "🌱",
    shape: "circle",
    primaryColor: "#94a3b8",
    xpReward: 0,
    requirementType: AchievementRequirementType.MILESTONE,
    conditions: [{ metric: "level", operator: "gte", value: 1 }],
  },
  {
    name: "First Post",
    description: "Publish your first look.",
    category: BadgeCategory.BEGINNER,
    rarity: BadgeRarity.COMMON,
    icon: "📸",
    shape: "circle",
    primaryColor: "#94a3b8",
    xpReward: 10,
    requirementType: AchievementRequirementType.ACTIVITY,
    conditions: [{ metric: "posts_created", operator: "gte", value: 1 }],
  },
  {
    name: "First Purchase",
    description: "Complete your first order on Outfiqe.",
    category: BadgeCategory.BEGINNER,
    rarity: BadgeRarity.COMMON,
    icon: "🛍️",
    shape: "circle",
    primaryColor: "#94a3b8",
    xpReward: 20,
    requirementType: AchievementRequirementType.COMMERCE,
    conditions: [{ metric: "purchases_count", operator: "gte", value: 1 }],
  },
  {
    name: "Rising Creator",
    description: "Publish 10 looks.",
    category: BadgeCategory.CREATOR,
    rarity: BadgeRarity.UNCOMMON,
    icon: "🌿",
    shape: "shield",
    primaryColor: "#22c55e",
    xpReward: 50,
    requirementType: AchievementRequirementType.ACTIVITY,
    conditions: [{ metric: "posts_created", operator: "gte", value: 10 }],
  },
  {
    name: "Fashion Star",
    description: "Receive 10,000 total likes across your looks.",
    category: BadgeCategory.CREATOR,
    rarity: BadgeRarity.RARE,
    icon: "⭐",
    shape: "star",
    primaryColor: "#f97316",
    xpReward: 100,
    requirementType: AchievementRequirementType.ENGAGEMENT,
    conditions: [{ metric: "total_likes", operator: "gte", value: 10000 }],
  },
  {
    name: "Trendsetter",
    description: "Receive 25,000 total likes across your looks.",
    category: BadgeCategory.CREATOR,
    rarity: BadgeRarity.EPIC,
    icon: "🔥",
    shape: "star",
    primaryColor: "#a855f7",
    xpReward: 250,
    requirementType: AchievementRequirementType.ENGAGEMENT,
    conditions: [{ metric: "total_likes", operator: "gte", value: 25000 }],
  },
  {
    name: "Fashion Icon",
    description: "Receive 50,000 total likes across your looks.",
    category: BadgeCategory.CREATOR,
    rarity: BadgeRarity.LEGENDARY,
    icon: "👑",
    shape: "diamond",
    primaryColor: "#eab308",
    xpReward: 500,
    requirementType: AchievementRequirementType.ENGAGEMENT,
    conditions: [{ metric: "total_likes", operator: "gte", value: 50000 }],
    isTitleEligible: true,
  },
  {
    name: "Community Friend",
    description: "Leave 10 comments on other creators' looks.",
    category: BadgeCategory.COMMUNITY,
    rarity: BadgeRarity.COMMON,
    icon: "💬",
    shape: "circle",
    primaryColor: "#94a3b8",
    xpReward: 15,
    requirementType: AchievementRequirementType.COMMUNITY,
    conditions: [{ metric: "comments_made", operator: "gte", value: 10 }],
  },
  {
    name: "Fashion Mentor",
    description: "Leave 100 comments and reach Level 5.",
    category: BadgeCategory.COMMUNITY,
    rarity: BadgeRarity.RARE,
    icon: "🤝",
    shape: "shield",
    primaryColor: "#f97316",
    xpReward: 150,
    requirementType: AchievementRequirementType.COMMUNITY,
    conditions: [
      { metric: "comments_made", operator: "gte", value: 100 },
      { metric: "level", operator: "gte", value: 5 },
    ],
  },
  {
    name: "100 Likes",
    description: "Receive 100 total likes across your looks.",
    category: BadgeCategory.ENGAGEMENT,
    rarity: BadgeRarity.COMMON,
    icon: "❤️",
    shape: "circle",
    primaryColor: "#94a3b8",
    xpReward: 10,
    requirementType: AchievementRequirementType.ENGAGEMENT,
    conditions: [{ metric: "total_likes", operator: "gte", value: 100 }],
  },
  {
    name: "1K Likes",
    description: "Receive 1,000 total likes across your looks.",
    category: BadgeCategory.ENGAGEMENT,
    rarity: BadgeRarity.UNCOMMON,
    icon: "❤️",
    shape: "shield",
    primaryColor: "#22c55e",
    xpReward: 50,
    requirementType: AchievementRequirementType.ENGAGEMENT,
    conditions: [{ metric: "total_likes", operator: "gte", value: 1000 }],
  },
  {
    name: "First Sale",
    description: "Earn your first creator commission.",
    category: BadgeCategory.COMMERCE,
    rarity: BadgeRarity.COMMON,
    icon: "💰",
    shape: "circle",
    primaryColor: "#94a3b8",
    xpReward: 25,
    requirementType: AchievementRequirementType.COMMERCE,
    conditions: [{ metric: "sales_count", operator: "gte", value: 1 }],
  },
  {
    name: "Top Seller",
    description: "Earn 100 creator commissions.",
    category: BadgeCategory.COMMERCE,
    rarity: BadgeRarity.EPIC,
    icon: "🏆",
    shape: "diamond",
    primaryColor: "#a855f7",
    xpReward: 300,
    requirementType: AchievementRequirementType.COMMERCE,
    conditions: [{ metric: "sales_count", operator: "gte", value: 100 }],
  },
  {
    name: "1K Views",
    description: "Reach 1,000 total views across your looks.",
    category: BadgeCategory.ENGAGEMENT,
    rarity: BadgeRarity.COMMON,
    icon: "👀",
    shape: "circle",
    primaryColor: "#94a3b8",
    xpReward: 100,
    requirementType: AchievementRequirementType.ENGAGEMENT,
    conditions: [{ metric: "total_views", operator: "gte", value: 1000 }],
  },
  {
    name: "10K Views",
    description: "Reach 10,000 total views across your looks.",
    category: BadgeCategory.ENGAGEMENT,
    rarity: BadgeRarity.RARE,
    icon: "👁️",
    shape: "star",
    primaryColor: "#f97316",
    xpReward: 500,
    requirementType: AchievementRequirementType.ENGAGEMENT,
    conditions: [{ metric: "total_views", operator: "gte", value: 10000 }],
  },
  {
    name: "Outfiqe OG",
    description: "Recognized by Outfiqe as a founding member of the community.",
    category: BadgeCategory.SPECIAL,
    rarity: BadgeRarity.EXCLUSIVE,
    icon: "🎖️",
    shape: "hexagon",
    primaryColor: "#0ea5e9",
    xpReward: 0,
    requirementType: AchievementRequirementType.ADMIN_AWARD,
    conditions: [],
    isTitleEligible: true,
  },
  {
    name: "Challenge Winner",
    description: "Won a seasonal Outfiqe styling challenge.",
    category: BadgeCategory.SPECIAL,
    rarity: BadgeRarity.EXCLUSIVE,
    icon: "🏅",
    shape: "hexagon",
    primaryColor: "#dc2626",
    xpReward: 200,
    requirementType: AchievementRequirementType.ADMIN_AWARD,
    conditions: [],
    assignmentLimit: 1,
    isTitleEligible: true,
  },
];

const seedGamificationBadges = async () => {
  for (const seedBadge of BADGE_SEED) {
    const existing = await prisma.badge.findFirst({ where: { name: seedBadge.name } });
    if (existing) continue;

    await prisma.badge.create({
      data: {
        name: seedBadge.name,
        description: seedBadge.description,
        category: seedBadge.category,
        rarity: seedBadge.rarity,
        icon: seedBadge.icon,
        designConfig: { shape: seedBadge.shape, primaryColor: seedBadge.primaryColor },
        xpReward: seedBadge.xpReward,
        assignmentLimit: seedBadge.assignmentLimit ?? null,
        isTitleEligible: seedBadge.isTitleEligible ?? false,
        achievement: {
          create: {
            name: seedBadge.name,
            description: seedBadge.description,
            requirementType: seedBadge.requirementType,
            requirementConfig: { conditions: seedBadge.conditions },
          },
        },
      },
    });
  }
};

type SeedUserBadgeGrant = {
  badgeName: string;
  isFeatured?: boolean;
  isTitle?: boolean;
};

const USER_BADGE_GRANTS_BY_CREATOR_INDEX: SeedUserBadgeGrant[][] = [
  [{ badgeName: "Fashion Newbie", isFeatured: true }, { badgeName: "First Post" }],
  [
    { badgeName: "Fashion Newbie" },
    { badgeName: "First Post" },
    { badgeName: "First Purchase" },
    { badgeName: "Rising Creator", isFeatured: true },
    { badgeName: "Community Friend", isFeatured: true },
  ],
  [
    { badgeName: "Fashion Newbie" },
    { badgeName: "First Post" },
    { badgeName: "First Purchase" },
    { badgeName: "100 Likes" },
    { badgeName: "First Sale", isFeatured: true },
    { badgeName: "1K Views", isFeatured: true },
  ],
  [
    { badgeName: "Fashion Newbie" },
    { badgeName: "First Post" },
    { badgeName: "Rising Creator" },
    { badgeName: "Fashion Star", isFeatured: true },
    { badgeName: "Fashion Mentor" },
    { badgeName: "1K Likes", isFeatured: true },
  ],
  [
    { badgeName: "Fashion Newbie" },
    { badgeName: "First Post" },
    { badgeName: "Rising Creator" },
    { badgeName: "Fashion Star" },
    { badgeName: "Trendsetter", isFeatured: true },
    { badgeName: "10K Views" },
    { badgeName: "Top Seller" },
    { badgeName: "Outfiqe OG", isFeatured: true, isTitle: true },
  ],
  [
    { badgeName: "Fashion Newbie" },
    { badgeName: "First Post" },
    { badgeName: "First Purchase" },
    { badgeName: "Rising Creator" },
    { badgeName: "Fashion Star" },
    { badgeName: "Trendsetter", isFeatured: true },
    { badgeName: "Fashion Icon", isFeatured: true, isTitle: true },
    { badgeName: "Community Friend" },
    { badgeName: "Fashion Mentor" },
    { badgeName: "100 Likes" },
    { badgeName: "1K Likes" },
    { badgeName: "First Sale" },
    { badgeName: "Top Seller" },
    { badgeName: "1K Views" },
    { badgeName: "10K Views" },
    { badgeName: "Challenge Winner", isFeatured: true },
  ],
];

async function seedUserBadges(creators: { id: string }[]) {
  const badges = await prisma.badge.findMany({
    select: { id: true, name: true, assignmentLimit: true },
  });
  const badgeByName = new Map(badges.map((badge) => [badge.name, badge]));

  for (const [index, grants] of USER_BADGE_GRANTS_BY_CREATOR_INDEX.entries()) {
    const creator = creators[index];
    if (!creator) continue;

    for (const grant of grants) {
      const badge = badgeByName.get(grant.badgeName);
      if (!badge) continue;

      const existing = await prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId: creator.id, badgeId: badge.id } },
      });
      if (existing) continue;

      await prisma.userBadge.create({
        data: {
          userId: creator.id,
          badgeId: badge.id,
          isFeatured: grant.isFeatured ?? false,
          isTitle: grant.isTitle ?? false,
        },
      });

      if (badge.assignmentLimit !== null) {
        await prisma.badge.update({
          where: { id: badge.id },
          data: { assignmentCount: { increment: 1 } },
        });
      }
    }
  }
}

async function main() {
  if (IS_PROD) {
    throw new Error(
      "prisma/seed.ts seeds demo/sample data and must never run against a production database. " +
        "Production bootstrap data ships via migrations instead — see withdraw/README.md for the pattern.",
    );
  }

  await seedCategories();
  const brands = await seedBrands();
  await seedProducts(brands);
  await seedDemoUser();
  const creators = await seedCreators();
  const shoppers = await seedShoppers();

  await seedCreatorLooks(creators);
  await seedCreatorLookImages();
  await seedHashtags();
  await seedProductSizes();
  await seedProductImages();
  await seedBrandRatings();

  const actors = [...creators, ...shoppers];
  await seedFollows(actors);
  await seedBrandFollows(actors);
  await seedEngagement(actors);
  await seedWornByCounts();
  await seedCollections();
  await seedHeroSlides();
  await seedCommissionTiers();
  await seedNepalBanks();
  await seedPlatformCommissionRule();
  await seedGatewayFeeRates();
  await seedLevels();
  await seedActivityXpConfig();
  await seedCreatorLeaderboardCategoryConfig();
  await seedGamificationBadges();
  await seedUserBadges(creators);
  await seedCrmAccess();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
