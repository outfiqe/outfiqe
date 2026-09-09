import {
  BrandRole,
  BrandTagReviewPolicy,
  TagRejectionReason,
  TagReportReason,
  TagReportSource,
  TagReportStatus,
  TagReviewStatus,
  UserRole,
} from "../src/generated/prisma/enums.js";
import { prisma } from "../src/shared/db/prisma.js";
import { slugifyHandle } from "../src/shared/utils/handle.utils.js";
import { hashPassword } from "../src/shared/utils/password.utils.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const OWNER_PASSWORD = "demo-password-123";

const POLICY_BY_INDEX: BrandTagReviewPolicy[] = [
  BrandTagReviewPolicy.OPEN,
  BrandTagReviewPolicy.TRUSTED_ONLY,
  BrandTagReviewPolicy.APPROVAL_REQUIRED,
  BrandTagReviewPolicy.TRUSTED_ONLY,
];

const REJECTIONS: { reason: TagRejectionReason; note: string | null }[] = [
  {
    reason: TagRejectionReason.NOT_OUR_PRODUCT,
    note: "This is a reseller listing, not our piece.",
  },
  { reason: TagRejectionReason.MISREPRESENTS_PRODUCT, note: "Wrong colourway — ours is ecru." },
  { reason: TagRejectionReason.COUNTERFEIT_SUSPECTED, note: null },
  { reason: TagRejectionReason.POLICY_VIOLATION, note: "Please tag the current-season SKU." },
];

const seedBrandOwners = async (brands: { id: string; name: string }[]) => {
  for (const brand of brands.slice(0, 2)) {
    const handle = slugifyHandle(`${brand.name} Owner`);
    const email = `owner-${handle}@example.com`;
    const owner = await prisma.user.upsert({
      where: { email },
      update: { role: UserRole.BRAND_OWNER },
      create: {
        email,
        name: `${brand.name} Owner`,
        handle,
        phone: `+97798${Math.floor(1_000_000 + Math.random() * 8_999_999)}`,
        passwordHash: await hashPassword(OWNER_PASSWORD),
        role: UserRole.BRAND_OWNER,
      },
    });
    await prisma.brandMembership.upsert({
      where: { userId_brandId: { userId: owner.id, brandId: brand.id } },
      update: {},
      create: { userId: owner.id, brandId: brand.id, role: BrandRole.OWNER },
    });
  }
};

export async function seedTagReview() {
  const alreadyMixed = await prisma.creatorLookProduct.count({
    where: { reviewStatus: { not: TagReviewStatus.APPROVED } },
  });
  if (alreadyMixed > 0) return;

  const brands = await prisma.brand.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (brands.length === 0) return;

  await Promise.all(
    brands.map((brand, index) =>
      prisma.brand.update({
        where: { id: brand.id },
        data: {
          tagReviewPolicy: POLICY_BY_INDEX[index % POLICY_BY_INDEX.length],
          autoApproveVerifiedBuyers: index % 3 !== 0,
        },
      }),
    ),
  );

  await seedBrandOwners(brands);

  const creators = await prisma.user.findMany({ where: { isCreator: true }, select: { id: true } });
  if (creators.length >= 2) {
    await prisma.brandTrustedCreator.createMany({
      data: creators.slice(0, 2).map((creator) => ({
        brandId: brands[0]!.id,
        creatorId: creator.id,
      })),
      skipDuplicates: true,
    });
  }

  const tags = await prisma.creatorLookProduct.findMany({
    select: { id: true, creatorLook: { select: { creatorId: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (tags.length === 0) return;

  const pendingTags = tags.slice(0, Math.min(8, tags.length));
  const rejectedTags = tags.slice(pendingTags.length, pendingTags.length + REJECTIONS.length);

  await Promise.all(
    pendingTags.map((tag, index) =>
      prisma.creatorLookProduct.update({
        where: { id: tag.id },
        data: {
          reviewStatus: TagReviewStatus.PENDING,
          approvalSource: null,
          reviewedAt: null,
          reviewedById: null,
          submittedAt: new Date(Date.now() - (index < 4 ? index * DAY_MS : (3 + index) * DAY_MS)),
        },
      }),
    ),
  );

  await Promise.all(
    rejectedTags.map((tag, index) => {
      const rejection = REJECTIONS[index % REJECTIONS.length]!;
      return prisma.creatorLookProduct.update({
        where: { id: tag.id },
        data: {
          reviewStatus: TagReviewStatus.REJECTED,
          approvalSource: null,
          rejectionReason: rejection.reason,
          rejectionNote: rejection.note,
          reviewedAt: new Date(Date.now() - (index + 1) * DAY_MS),
          submittedAt: new Date(Date.now() - (index + 3) * DAY_MS),
        },
      });
    }),
  );

  const flaggedCreatorId = rejectedTags[2]?.creatorLook.creatorId;
  if (flaggedCreatorId) {
    await prisma.user.update({
      where: { id: flaggedCreatorId },
      data: { tagCounterfeitFlagCount: 2 },
    });
  }

  const liveTag = tags[tags.length - 1];
  if (liveTag && rejectedTags[2]) {
    await prisma.tagReviewReport.createMany({
      data: [
        {
          creatorLookProductId: liveTag.id,
          source: TagReportSource.PUBLIC_REPORT,
          reason: TagReportReason.MISLEADING,
          note: "The photo is clearly a different jacket than the one linked.",
          status: TagReportStatus.OPEN,
        },
        {
          creatorLookProductId: rejectedTags[2].id,
          source: TagReportSource.BRAND_COUNTERFEIT_REJECTION,
          reason: TagReportReason.COUNTERFEIT,
          status: TagReportStatus.ACTIONED,
          resolutionNote: "Confirmed counterfeit, tag already removed by the brand.",
          reviewedAt: new Date(Date.now() - DAY_MS),
        },
      ],
    });
  }
}
