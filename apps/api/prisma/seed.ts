import { slugifyHandle } from "#lib/handle.utils.js";
import { hashPassword } from "#lib/password.utils.js";

import {
  CategoryStatus,
  CollectionStatus,
  CreatorStatus,
  FollowTargetType,
  HeroSlideStatus,
  ProductStatus,
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

// Centimeters, one per CREATOR_NAMES entry, matching the "5 feet 4 inches, wearing S" pattern
// the product page and creator profile display.
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

  console.log(`Seeded user: ${email}`);
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

  if (approvedProducts.length === 0) {
    console.log("No approved products yet — skipping creator look seed.");
    return;
  }

  const existingLooks = await prisma.creatorLook.count();
  if (existingLooks > 0) {
    console.log(`Creator looks already seeded (${existingLooks}) — skipping.`);
    return;
  }

  for (let i = 0; i < LOOK_COUNT; i++) {
    const creatorIndex = i % creators.length;
    const creator = creators[creatorIndex];
    const sizeWorn = CREATOR_SIZES_WORN[creatorIndex % CREATOR_SIZES_WORN.length];
    const tagCount = MIN_TAGGED_PRODUCTS + Math.floor(Math.random() * MAX_TAGGED_PRODUCTS);
    const productIds = shuffledSample(approvedProducts, tagCount).map((product) => product.id);

    await prisma.creatorLook.create({
      data: {
        creatorId: creator.id,
        imageUrl: `https://picsum.photos/seed/outfiqe-look-${i}/600/750`,
        caption: LOOK_CAPTIONS[i % LOOK_CAPTIONS.length],
        taggedProducts: { create: productIds.map((productId) => ({ productId, sizeWorn })) },
      },
    });
  }

  console.log(`Seeded ${LOOK_COUNT} creator looks across ${creators.length} creators`);
}

// Extracts the "#tag" tokens already baked into LOOK_CAPTIONS above and stores them as
// CreatorLookHashtag rows, so the trending-tags endpoint has real data to rank.
async function seedHashtags() {
  const existing = await prisma.creatorLookHashtag.count();
  if (existing > 0) {
    console.log(`Look hashtags already seeded (${existing}) — skipping.`);
    return;
  }

  const looks = await prisma.creatorLook.findMany({ select: { id: true, caption: true } });
  let created = 0;

  for (const look of looks) {
    const tags = [...new Set((look.caption?.match(/#\w+/g) ?? []).map((tag) => tag.slice(1)))];
    if (tags.length === 0) continue;

    await prisma.creatorLookHashtag.createMany({
      data: tags.map((tag) => ({ creatorLookId: look.id, tag })),
    });
    created += tags.length;
  }

  console.log(`Seeded ${created} look hashtags`);
}

// Every seeded user follows a handful of others, giving the "following" feed tab and the
// suggested-creators sidebar something to show locally. Bypasses follow.repository (this is a
// bulk fixture load, not the request path) so followerCount/followingCount are kept in sync here.
async function seedFollows(actors: { id: string }[]) {
  const existing = await prisma.follow.count({ where: { followingType: FollowTargetType.USER } });
  if (existing > 0) {
    console.log(`User follows already seeded (${existing}) — skipping.`);
    return;
  }

  let created = 0;
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
      created++;
    }
  }

  console.log(`Seeded ${created} follows across ${actors.length} users`);
}

// Likes, saves, and comments are seeded the same way: guard by an overall count, then insert
// directly and bump the denormalized counters on CreatorLook to match (bypassing
// creatorLook.repository for the same bulk-fixture reason as seedFollows above).
async function seedEngagement(actors: { id: string }[]) {
  const looks = await prisma.creatorLook.findMany({ select: { id: true } });
  if (looks.length === 0) return;

  const existingLikes = await prisma.creatorLookLike.count();
  if (existingLikes === 0) {
    let likeCount = 0;
    for (const look of looks) {
      const likers = shuffledSample(
        actors,
        Math.min(actors.length, 3 + Math.floor(Math.random() * 5)),
      );
      for (const liker of likers) {
        await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: liker.id } });
        likeCount++;
      }
      await prisma.creatorLook.update({
        where: { id: look.id },
        data: { likeCount: likers.length },
      });
    }
    console.log(`Seeded ${likeCount} look likes`);
  } else {
    console.log(`Look likes already seeded (${existingLikes}) — skipping.`);
  }

  const existingSaves = await prisma.creatorLookSave.count();
  if (existingSaves === 0) {
    let saveCount = 0;
    for (const look of looks) {
      const savers = shuffledSample(
        actors,
        Math.min(actors.length, 1 + Math.floor(Math.random() * 3)),
      );
      for (const saver of savers) {
        await prisma.creatorLookSave.create({ data: { creatorLookId: look.id, userId: saver.id } });
        saveCount++;
      }
      await prisma.creatorLook.update({
        where: { id: look.id },
        data: { saveCount: savers.length },
      });
    }
    console.log(`Seeded ${saveCount} look saves`);
  } else {
    console.log(`Look saves already seeded (${existingSaves}) — skipping.`);
  }

  const existingComments = await prisma.creatorLookComment.count();
  if (existingComments === 0) {
    let commentCount = 0;
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
        commentCount++;
      }
      await prisma.creatorLook.update({
        where: { id: look.id },
        data: { commentCount: commenters.length },
      });
    }
    console.log(`Seeded ${commentCount} look comments`);
  } else {
    console.log(`Look comments already seeded (${existingComments}) — skipping.`);
  }
}

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

async function seedProductSizes() {
  const existing = await prisma.productSize.count();
  if (existing > 0) {
    console.log(`Product sizes already seeded (${existing}) — skipping.`);
    return;
  }

  const products = await prisma.product.findMany({ select: { id: true } });
  if (products.length === 0) return;

  let created = 0;
  for (const [index, product] of products.entries()) {
    const soldOutIndex = index % DEFAULT_SIZES.length;
    await prisma.productSize.createMany({
      data: DEFAULT_SIZES.map((label, i) => ({
        productId: product.id,
        label,
        inStock: i !== soldOutIndex,
        sortOrder: i,
      })),
    });
    created += DEFAULT_SIZES.length;
  }

  console.log(`Seeded ${created} product sizes across ${products.length} products`);
}

async function seedBrandRatings() {
  const brands = await prisma.brand.findMany({ where: { rating: null }, select: { id: true } });
  if (brands.length === 0) {
    console.log("Brand ratings already seeded — skipping.");
    return;
  }

  for (const brand of brands) {
    const rating = Math.round((3.8 + Math.random() * 1.2) * 10) / 10;
    await prisma.brand.update({ where: { id: brand.id }, data: { rating } });
  }

  console.log(`Seeded ratings for ${brands.length} brands`);
}

async function seedBrandFollows(actors: { id: string }[]) {
  const brands = await prisma.brand.findMany({ select: { id: true } });
  if (brands.length === 0) return;

  const existing = await prisma.follow.count({ where: { followingType: FollowTargetType.BRAND } });
  if (existing > 0) {
    console.log(`Brand follows already seeded (${existing}) — skipping.`);
    return;
  }

  let created = 0;
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
      created++;
    }
  }

  console.log(`Seeded ${created} brand follows across ${brands.length} brands`);
}

// The API keeps Product.wornByCount denormalized, recomputed on write (see
// productService.recountWornBy). Seed data is written directly with $transaction-free
// prisma calls, bypassing that path, so it's recomputed once here at the end.
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

  console.log(`Recomputed wornByCount for ${approvedProducts.length} products`);
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
  if (existing > 0) {
    console.log(`Categories already seeded (${existing}) — skipping.`);
    return;
  }

  for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
    await prisma.category.create({
      data: { ...category, status: CategoryStatus.PUBLISHED, sortOrder: index },
    });
  }

  console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories`);
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
  if (existing > 0) {
    console.log(`Collections already seeded (${existing}) — skipping.`);
    return;
  }

  const approvedProducts = await prisma.product.findMany({
    where: { status: ProductStatus.APPROVED },
    select: { id: true, categories: { select: { slug: true } }, price: true },
  });

  if (approvedProducts.length === 0) {
    console.log("No approved products yet — skipping collection seed.");
    return;
  }

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

  console.log(`Seeded ${SEED_COLLECTIONS.length} collections`);
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
  if (existing > 0) {
    console.log(`Hero slides already seeded (${existing}) — skipping.`);
    return;
  }

  for (const [index, slide] of SEED_HERO_SLIDES.entries()) {
    await prisma.heroSlide.create({
      data: { ...slide, status: HeroSlideStatus.PUBLISHED, sortOrder: index },
    });
  }

  console.log(`Seeded ${SEED_HERO_SLIDES.length} hero slides`);
};

async function main() {
  await seedCategories();
  await seedDemoUser();
  const creators = await seedCreators();
  const shoppers = await seedShoppers();

  await seedCreatorLooks(creators);
  await seedHashtags();
  await seedProductSizes();
  await seedBrandRatings();

  const actors = [...creators, ...shoppers];
  await seedFollows(actors);
  await seedBrandFollows(actors);
  await seedEngagement(actors);
  await seedWornByCounts();
  await seedCollections();
  await seedHeroSlides();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
