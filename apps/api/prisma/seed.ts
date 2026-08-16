import { slugifyHandle } from "#lib/handle.utils.js";
import { hashPassword } from "#lib/password.utils.js";

import {
  CategoryStatus,
  CollectionStatus,
  CreatorStatus,
  FollowTargetType,
  HeroSlideStatus,
  ProductStatus,
  ProductType,
} from "../src/generated/prisma/enums.js";
import { prisma } from "../src/shared/db/prisma.js";

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

const PRODUCT_IMAGE_POOLS: Record<string, string[]> = {
  "Pleated Trousers": TROUSERS_PHOTOS,
  "Linen Kurta": TRADITIONAL_PHOTOS,
  "Oversized Graphic Tee": TSHIRT_PHOTOS,
  "Cargo Pants": CARGO_PHOTOS,
  "Bucket Hat": BUCKET_HAT_PHOTOS,
  "Wool Bomber Jacket": BOMBER_PHOTOS,
  "Formal Pants": FORMAL_PHOTOS,
};

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
  { slug: "formal", name: "Formal" },
  { slug: "traditional", name: "Traditional" },
  { slug: "streetwear", name: "Streetwear" },
  { slug: "casual", name: "Casual" },
  { slug: "minimal", name: "Minimal" },
  { slug: "y2k", name: "Y2K" },
  { slug: "old-money", name: "Old Money" },
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
];

const seedBrands = async () => {
  const existing = await prisma.brand.findMany();
  if (existing.length > 0) return existing;

  return Promise.all(SEED_BRANDS.map((brand) => prisma.brand.create({ data: brand })));
};

// Names match PRODUCT_IMAGE_POOLS below, which keys product photos by name.
const SEED_PRODUCTS = [
  {
    name: "Oversized Graphic Tee",
    price: 1450,
    type: ProductType.TOPS,
    categorySlugs: ["streetwear", "casual"],
    brandIndex: 0,
  },
  {
    name: "Cargo Pants",
    price: 2600,
    type: ProductType.PANTS,
    categorySlugs: ["streetwear", "casual"],
    brandIndex: 0,
  },
  {
    name: "Wool Bomber Jacket",
    price: 5400,
    type: ProductType.OUTERWEAR,
    categorySlugs: ["streetwear", "casual"],
    brandIndex: 0,
  },
  {
    name: "Formal Pants",
    price: 3400,
    type: ProductType.PANTS,
    categorySlugs: ["formal"],
    brandIndex: 1,
  },
  {
    name: "Pleated Trousers",
    price: 3200,
    type: ProductType.PANTS,
    categorySlugs: ["formal"],
    brandIndex: 1,
  },
  {
    name: "Linen Kurta",
    price: 2800,
    type: ProductType.TOPS,
    categorySlugs: ["traditional"],
    brandIndex: 2,
  },
  {
    name: "Bucket Hat",
    price: 950,
    type: ProductType.HEADWEAR,
    categorySlugs: ["streetwear"],
    brandIndex: 3,
  },
];

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
  pick: (product: { id: string; categories: { slug: string }[]; price: number }) => boolean;
};

const hasCategory = (product: { categories: { slug: string }[] }, slug: string): boolean =>
  product.categories.some((category) => category.slug === slug);

const SEED_COLLECTIONS: SeedCollection[] = [
  {
    name: "Dashain Edit '26",
    slug: "dashain-edit-26",
    description: "Daura suruwal, kurta sets and modern cuts styled as full looks for Dashain.",
    pick: (product) => hasCategory(product, "traditional") || hasCategory(product, "formal"),
  },
  {
    name: "Under Rs. 3,000",
    slug: "under-3000",
    description: "Real pieces from Nepali brands, all under three thousand rupees.",
    pick: (product) => product.price < 3000,
  },
  {
    name: "Office Ready",
    slug: "office-ready",
    description: "Structured, put-together pieces that work from desk to dinner.",
    pick: (product) => hasCategory(product, "formal"),
  },
  {
    name: "Weekend Fits",
    slug: "weekend-fits",
    description: "Easy, off-duty pieces for days with nowhere to be.",
    pick: (product) => hasCategory(product, "casual") || hasCategory(product, "streetwear"),
  },
];

const COLLECTION_PRODUCT_LIMIT = 8;

const seedCollections = async () => {
  const existing = await prisma.collection.count();
  if (existing > 0) return;

  const approvedProducts = await prisma.product.findMany({
    where: { status: ProductStatus.APPROVED },
    select: { id: true, categories: { select: { slug: true } }, price: true },
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
  },
  {
    tag: "Collection 02: Creators",
    title: "Shop the\nlooks you scroll",
    description:
      "Every outfit tagged by the Nepali creators who styled it. Tap a look, get the full fit.",
    ctaLabel: "See creator looks",
    ctaHref: "/explore",
  },
  {
    tag: "Collection 03: Just In",
    title: "New brands,\nfresh this week",
    description: "Five new Kathmandu labels just went live, all vetted and set up by our team.",
    ctaLabel: "Browse new brands",
    ctaHref: "/collections",
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

async function main() {
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
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
