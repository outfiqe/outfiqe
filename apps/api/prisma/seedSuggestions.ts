import { config } from "dotenv";
config();

import { CreatorStatus, FollowTargetType } from "../src/generated/prisma/enums.js";
import { creatorLookService } from "../src/modules/creator-looks/creatorLook.service.js";
import type { UserRecord } from "../src/modules/users/user.types.js";
import { prisma } from "../src/shared/db/prisma.js";
import { disconnectRedis } from "../src/shared/redis/redis.client.js";
import { hashPassword } from "../src/shared/utils/password.utils.js";

const DEMO_PASSWORD = "demo-password-123";
const TEST_VIEWER_EMAIL = "suggestions-tester@example.com";

const FIRST_NAMES = [
  "Aarav",
  "Aayusha",
  "Bishal",
  "Kripa",
  "Dikshya",
  "Nischal",
  "Sabina",
  "Rohan",
  "Sneha",
  "Kabin",
  "Pratima",
  "Yubraj",
  "Alisha",
  "Suman",
  "Rakshya",
  "Bikash",
  "Manisha",
  "Nirajan",
  "Sristi",
  "Aashish",
];
const LAST_NAMES = [
  "Shrestha",
  "Gurung",
  "Thapa",
  "Karki",
  "Magar",
  "Lama",
  "Rai",
  "Poudel",
  "Adhikari",
  "Basnet",
  "Khadka",
  "Bhattarai",
  "Sharma",
  "Tamang",
  "Maharjan",
];

const nameFor = (index: number): string =>
  `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[(index * 7) % LAST_NAMES.length]}`;

const unsplashUrl = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

const HASHTAG_CLUSTERS = [
  {
    tag: "streetstyle",
    caption: "Thamel street style today",
    photos: [
      "1578102718171-ec1f91680562",
      "1624353656309-8be1a6c457be",
      "1534404483017-8743b4e935cd",
    ],
  },
  {
    tag: "oldmoney",
    caption: "Old-money fit for a brunch",
    photos: [
      "1633769573304-90d2d44eef0c",
      "1624983757883-6d3a17e8b964",
      "1762148039826-06811e4d4d99",
    ],
  },
  {
    tag: "dhaka",
    caption: "Traditional pieces, modern styling",
    photos: [
      "1622598661631-3a46559a4817",
      "1763733595166-41745662d1a7",
      "1766763846257-bcff4f97f79b",
    ],
  },
  {
    tag: "minimalfit",
    caption: "Minimal fit, maximum comfort",
    photos: ["1551232864-3f0890e580d9", "1621341103818-01dada8c6ef8", "1653875842174-429c1b467548"],
  },
  {
    tag: "y2k",
    caption: "Y2K revival for the weekend",
    photos: [
      "1515886657613-9f3515b0c78f",
      "1626781309887-cdfb9f258c64",
      "1576188973526-0e5d7047b0cf",
    ],
  },
];

const NEW_CREATOR_COUNT = 45;
const FRESH_CREATOR_COUNT = 3;
const FAN_COUNT = 20;
const CONNECTOR_COUNT = 6;
const MUTUAL_FOLLOW_TARGETS_PER_CONNECTOR = 15;
const VIEWER_DIRECT_FOLLOW_COUNT = 4;
const VIEWER_ENGAGED_CLUSTER_COUNT = 2;
const VIEWER_ENGAGED_CREATORS_PER_CLUSTER = 3;

const FRESHNESS_APPROVED_AT = new Date();
const ESTABLISHED_APPROVED_AT = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

const shuffledSample = <T>(items: T[], count: number): T[] =>
  [...items].sort(() => Math.random() - 0.5).slice(0, Math.min(count, items.length));

const upsertPlainUser = async (email: string, name: string, handle: string, phone: string) =>
  prisma.user.upsert({
    where: { email },
    update: { emailVerified: true },
    create: {
      email,
      name,
      handle,
      phone,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      emailVerified: true,
    },
  });

const upsertCreator = async (
  email: string,
  name: string,
  handle: string,
  phone: string,
  creatorApprovedAt: Date,
): Promise<UserRecord> =>
  prisma.user.upsert({
    where: { email },
    update: {
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
      creatorApprovedAt,
      emailVerified: true,
    },
    create: {
      email,
      name,
      handle,
      phone,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
      creatorApprovedAt,
      emailVerified: true,
    },
  });

const followUser = async (followerId: string, followingId: string): Promise<void> => {
  if (followerId === followingId) return;

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingType_followingId: {
        followerId,
        followingType: FollowTargetType.USER,
        followingId,
      },
    },
  });
  if (existing) return;

  await prisma.follow.create({
    data: { followerId, followingType: FollowTargetType.USER, followingId },
  });
  await prisma.user.update({
    where: { id: followingId },
    data: { followerCount: { increment: 1 } },
  });
  await prisma.user.update({
    where: { id: followerId },
    data: { followingCount: { increment: 1 } },
  });
};

const createLookWithHashtag = async (
  creatorId: string,
  cluster: (typeof HASHTAG_CLUSTERS)[number],
  photoIndex: number,
) => {
  const look = await prisma.creatorLook.create({
    data: {
      creatorId,
      imageUrl: unsplashUrl(cluster.photos[photoIndex % cluster.photos.length]),
      caption: `${cluster.caption} #${cluster.tag}`,
    },
  });
  await prisma.creatorLookHashtag.create({ data: { creatorLookId: look.id, tag: cluster.tag } });
  return look;
};

const likeLook = async (lookId: string, userId: string): Promise<void> => {
  const existing = await prisma.creatorLookLike.findUnique({
    where: { creatorLookId_userId: { creatorLookId: lookId, userId } },
  });
  if (existing) return;

  await prisma.creatorLookLike.create({ data: { creatorLookId: lookId, userId } });
  await prisma.creatorLook.update({ where: { id: lookId }, data: { likeCount: { increment: 1 } } });
};

const saveLook = async (lookId: string, userId: string): Promise<void> => {
  const existing = await prisma.creatorLookSave.findUnique({
    where: { creatorLookId_userId: { creatorLookId: lookId, userId } },
  });
  if (existing) return;

  await prisma.creatorLookSave.create({ data: { creatorLookId: lookId, userId } });
  await prisma.creatorLook.update({ where: { id: lookId }, data: { saveCount: { increment: 1 } } });
};

async function main() {
  console.warn("Seeding a large creator-suggestion testing dataset...");

  const viewer = await upsertPlainUser(
    TEST_VIEWER_EMAIL,
    "Suggestion Tester",
    "suggestiontester",
    "+9779800000000",
  );

  const fans = await Promise.all(
    Array.from({ length: FAN_COUNT }, (_, index) =>
      upsertPlainUser(
        `suggestion-fan${index + 1}@example.com`,
        nameFor(index + 100),
        `suggestionfan${index}`,
        `+9779801${String(index).padStart(6, "0")}`,
      ),
    ),
  );

  const newCreators = await Promise.all(
    Array.from({ length: NEW_CREATOR_COUNT }, (_, index) => {
      const isFresh = index < FRESH_CREATOR_COUNT;
      return upsertCreator(
        `suggestion-creator${index + 1}@example.com`,
        nameFor(index),
        `suggestioncreator${index}`,
        `+9779802${String(index).padStart(6, "0")}`,
        isFresh ? FRESHNESS_APPROVED_AT : ESTABLISHED_APPROVED_AT,
      );
    }),
  );

  const freshCreators = newCreators.slice(0, FRESH_CREATOR_COUNT);
  const establishedCreators = newCreators.slice(FRESH_CREATOR_COUNT);

  console.warn(
    `Created/updated ${newCreators.length} creators (${freshCreators.length} freshly-approved, ` +
      `zero-history) and ${fans.length} fan accounts.`,
  );

  const clusterOf = (index: number) => HASHTAG_CLUSTERS[index % HASHTAG_CLUSTERS.length];
  const looksByCreatorId = new Map<string, { id: string }[]>();

  for (const [index, creator] of establishedCreators.entries()) {
    const cluster = clusterOf(index);
    const lookCount = 1 + (index % 3);
    const looks = [];
    for (let photoIndex = 0; photoIndex < lookCount; photoIndex += 1) {
      looks.push(await createLookWithHashtag(creator.id, cluster, photoIndex));
    }
    looksByCreatorId.set(creator.id, looks);

    const engagementTier = index % 4;
    const likerCount = engagementTier * 4;
    const likers = shuffledSample(fans, likerCount);
    for (const look of looks) {
      for (const fan of likers) await likeLook(look.id, fan.id);
    }
  }

  console.warn(`Posted ${establishedCreators.length * 2} looks (avg) with tiered engagement.`);

  const connectors = fans.slice(0, CONNECTOR_COUNT);
  for (const connector of connectors) await followUser(viewer.id, connector.id);

  for (const connector of connectors) {
    const targets = shuffledSample(establishedCreators, MUTUAL_FOLLOW_TARGETS_PER_CONNECTOR);
    for (const target of targets) await followUser(connector.id, target.id);
  }

  console.warn(
    `Viewer follows ${connectors.length} connectors, each following up to ` +
      `${MUTUAL_FOLLOW_TARGETS_PER_CONNECTOR} creators (mutual-follow signal).`,
  );

  const directlyFollowed = shuffledSample(establishedCreators, VIEWER_DIRECT_FOLLOW_COUNT);
  for (const creator of directlyFollowed) await followUser(viewer.id, creator.id);

  const directlyFollowedIds = new Set(directlyFollowed.map((creator) => creator.id));
  const engagedClusters = HASHTAG_CLUSTERS.slice(0, VIEWER_ENGAGED_CLUSTER_COUNT);

  for (const [clusterIndex, cluster] of engagedClusters.entries()) {
    const creatorsInCluster = establishedCreators.filter(
      (creator, index) =>
        clusterOf(index).tag === cluster.tag && !directlyFollowedIds.has(creator.id),
    );
    const engageTargets = shuffledSample(creatorsInCluster, VIEWER_ENGAGED_CREATORS_PER_CLUSTER);

    for (const creator of engageTargets) {
      const looks = looksByCreatorId.get(creator.id) ?? [];
      for (const look of looks) {
        await likeLook(look.id, viewer.id);
        if (clusterIndex === 0) await saveLook(look.id, viewer.id);
      }
    }
  }

  console.warn(
    `Viewer directly follows ${directlyFollowed.length} creators (excluded from suggestions) and ` +
      `engaged with posts in ${engagedClusters.length} hashtag clusters without following those creators.`,
  );

  console.warn("Running trend aggregation + scoring so the momentum/creator cache is warm...");
  await creatorLookService.runTrendingAggregation();
  const { ranked } = await creatorLookService.runTrendingScoring();
  console.warn(`Scored ${ranked.length} posts; creator momentum cache refreshed alongside it.`);

  console.warn('\nDone. Log in and open /explore to see the ranked "Creators to follow" rail:');
  console.warn(`  email:    ${TEST_VIEWER_EMAIL}`);
  console.warn(`  password: ${DEMO_PASSWORD}`);
  console.warn(
    "\nThat account follows 6 connector accounts (each following a random slice of the new " +
      "creators, for mutual-follow suggestions), already follows 4 creators directly (should " +
      "never appear in suggestions), and has liked/saved posts in 2 hashtag clusters from " +
      "creators it doesn't follow (engaged-not-followed + hashtag-affinity signals). 3 creators " +
      "were approved moments ago with zero posts/followers, to exercise the new-creator " +
      "freshness floor.",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await disconnectRedis();
  });
