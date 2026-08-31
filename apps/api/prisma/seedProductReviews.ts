import "../src/config/load-env.js";

import { UserRole } from "../src/generated/prisma/enums.js";
import { productRepository } from "../src/modules/products/product.repository.js";
import { prisma } from "../src/shared/db/prisma.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const REVIEW_LOOKBACK_DAYS = 120;

const unsplashUrl = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

const REVIEW_PHOTOS = [
  "1591047139829-d91aecb6caea",
  "1521572163474-6864f9cf17ab",
  "1552374196-c4e7ffc6e126",
  "1503342217505-b0a15ec3261c",
  "1445205170230-053b83016050",
];

type RatingTier = "positive" | "neutral" | "negative";

const REVIEW_CONTENT: Record<RatingTier, { title: string; body: string }[]> = {
  positive: [
    {
      title: "Exceeded my expectations",
      body: "The fabric feels premium and the stitching is solid. Fits true to size and the color matches the photos exactly.",
    },
    {
      title: "My new favorite piece",
      body: "Wore this out for Dashain and got so many compliments. Comfortable all day and holds up well after a few washes.",
    },
    {
      title: "Worth every rupee",
      body: "Fast delivery and the quality is way better than I expected for the price. Definitely ordering more from this brand.",
    },
    {
      title: "Perfect for Kathmandu weather",
      body: "Breathable, well-made, and true to size. This has become a staple in my wardrobe already.",
    },
    {
      title: "Obsessed",
      body: "Exactly as described. The material feels premium and the fit is spot on for my usual size.",
    },
  ],
  neutral: [
    {
      title: "Decent for the price",
      body: "It's a solid piece for the price but the fabric is a bit thinner than I expected. Still wearable and looks good on.",
    },
    {
      title: "Good, not great",
      body: "Fit is okay — true to size in the shoulders but a little loose around the waist. Might exchange for a smaller size.",
    },
    {
      title: "Does the job",
      body: "Nothing wrong with it, just didn't blow me away. Delivery was on time and packaging was neat.",
    },
  ],
  negative: [
    {
      title: "Runs small",
      body: "Sizing is way off from the chart — ordered my usual size and it's noticeably tight across the shoulders. Fabric quality is fine though.",
    },
    {
      title: "Color looked different",
      body: "Color looked warmer in the photos than in person. Considering a return since it doesn't match what I planned to pair it with.",
    },
    {
      title: "Stitching came loose",
      body: "A seam came loose after the first wash. Expected better quality control for the price point.",
    },
  ],
};

const RATING_TIERS: { tier: RatingTier; rating: number; weight: number }[] = [
  { tier: "positive", rating: 5, weight: 5 },
  { tier: "positive", rating: 4, weight: 4 },
  { tier: "neutral", rating: 3, weight: 2 },
  { tier: "negative", rating: 2, weight: 1 },
  { tier: "negative", rating: 1, weight: 1 },
];
const TOTAL_RATING_WEIGHT = RATING_TIERS.reduce((sum, entry) => sum + entry.weight, 0);

const MAX_REVIEWS_PER_PRODUCT = 8;
const PHOTO_ATTACH_CHANCE = 0.25;
const HELPFUL_VOTE_CHANCE = 0.4;
const MAX_HELPFUL_VOTERS_PER_REVIEW = 5;

const pickRating = (): { tier: RatingTier; rating: number } => {
  let roll = Math.random() * TOTAL_RATING_WEIGHT;
  for (const entry of RATING_TIERS) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return RATING_TIERS[0];
};

const pickOne = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const randomPastDate = (): Date =>
  new Date(Date.now() - Math.floor(Math.random() * REVIEW_LOOKBACK_DAYS) * MS_PER_DAY);

const seedReviewsForProduct = async (
  productId: string,
  reviewerPool: string[],
): Promise<boolean> => {
  const reviewerCount = Math.min(
    reviewerPool.length,
    Math.floor(Math.random() * (MAX_REVIEWS_PER_PRODUCT + 1)),
  );
  if (reviewerCount === 0) return false;

  const reviewers = shuffle(reviewerPool).slice(0, reviewerCount);

  for (const userId of reviewers) {
    const { tier, rating } = pickRating();
    const content = pickOne(REVIEW_CONTENT[tier]);
    const createdAt = randomPastDate();

    const review = await prisma.productReview.upsert({
      where: { productId_userId: { productId, userId } },
      update: {},
      create: {
        productId,
        userId,
        rating,
        title: content.title,
        body: content.body,
        createdAt,
        updatedAt: createdAt,
        images:
          Math.random() < PHOTO_ATTACH_CHANCE
            ? { create: [{ url: unsplashUrl(pickOne(REVIEW_PHOTOS)), sortOrder: 0 }] }
            : undefined,
      },
    });

    if (Math.random() >= HELPFUL_VOTE_CHANCE) continue;

    const voters = shuffle(reviewerPool.filter((id) => id !== userId)).slice(
      0,
      1 + Math.floor(Math.random() * MAX_HELPFUL_VOTERS_PER_REVIEW),
    );
    if (voters.length === 0) continue;

    await prisma.productReviewHelpfulVote.createMany({
      data: voters.map((voterId) => ({ reviewId: review.id, userId: voterId })),
      skipDuplicates: true,
    });
    const helpfulCount = await prisma.productReviewHelpfulVote.count({
      where: { reviewId: review.id },
    });
    await prisma.productReview.update({ where: { id: review.id }, data: { helpfulCount } });
  }

  return true;
};

async function main() {
  const products = await prisma.product.findMany({
    where: { status: "APPROVED", deletedAt: null },
    select: { id: true },
  });
  const reviewers = await prisma.user.findMany({
    where: { role: UserRole.CUSTOMER },
    select: { id: true },
  });

  if (products.length === 0) {
    console.warn("No approved products found — run `pnpm db:seed` first.");
    return;
  }
  if (reviewers.length === 0) {
    console.warn("No customer users found — run `pnpm db:seed` first.");
    return;
  }

  const reviewerIds = reviewers.map((user) => user.id);
  let productsWithReviews = 0;

  for (const product of products) {
    const seeded = await seedReviewsForProduct(product.id, reviewerIds);
    if (!seeded) continue;
    productsWithReviews += 1;
    await productRepository.refreshRatingSummary(product.id);
  }

  const totalReviews = await prisma.productReview.count();
  console.warn(
    `Seeded reviews for ${productsWithReviews}/${products.length} products (${totalReviews} reviews total).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
