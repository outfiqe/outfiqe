import "../src/config/load-env.js";

import { randomUUID } from "node:crypto";

import { closeImageProcessingQueues } from "@outfiqe/image-pipeline";

import { BrandRole, UserRole } from "../src/generated/prisma/enums.js";
import {
  checkImageIngestBackPressure,
  imageProcessingQueues,
} from "../src/modules/image-processing/image-processing.queue.js";
import { imageProcessingService } from "../src/modules/image-processing/image-processing.service.js";
import { imageTempStorageAdapter } from "../src/modules/image-processing/image-processing.storage.js";
import { prisma } from "../src/shared/db/prisma.js";

const BATCH_SIZE = 10;
const PAUSE_BETWEEN_BATCHES_MS = 750;
const BACK_PRESSURE_WAIT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 20_000;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

const isDryRun = process.argv.includes("--dry-run");
const limitFlag = process.argv.find((arg) => arg.startsWith("--limit="));
const rowLimit = limitFlag ? Number.parseInt(limitFlag.slice("--limit=".length), 10) : Infinity;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PendingDomainImage = {
  label: string;
  imageRowId: string;
  url: string;
  ownerId: string;
  link: (imageAssetId: string) => Promise<unknown>;
};

const resolveExtension = (contentType: string | null, url: string): string => {
  const normalizedType = contentType?.split(";")[0]?.trim().toLowerCase();
  if (normalizedType && EXTENSION_BY_CONTENT_TYPE[normalizedType]) {
    return EXTENSION_BY_CONTENT_TYPE[normalizedType];
  }
  const urlExtension = /\.(jpe?g|png|webp|avif)(?:$|\?)/i.exec(url)?.[1]?.toLowerCase();
  if (!urlExtension) return ".jpg";
  return urlExtension === "jpeg" ? ".jpg" : `.${urlExtension}`;
};

const downloadImage = async (
  url: string,
): Promise<{ buffer: Buffer; contentType: string | null }> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`GET ${url} responded ${response.status}`);
  }
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type"),
  };
};

const waitForIngestCapacity = async () => {
  let decision = await checkImageIngestBackPressure();
  while (!decision.allowed) {
    console.warn(`  ingest queue saturated; waiting ${BACK_PRESSURE_WAIT_MS / 1000}s`);
    await sleep(BACK_PRESSURE_WAIT_MS);
    decision = await checkImageIngestBackPressure();
  }
};

const backfillImage = async (pending: PendingDomainImage): Promise<"linked" | "skipped"> => {
  if (!/^https?:\/\//i.test(pending.url)) {
    console.warn(`  ${pending.label}: skipped, url is not http(s) (${pending.url.slice(0, 60)})`);
    return "skipped";
  }

  if (isDryRun) {
    console.warn(`  ${pending.label}: would process ${pending.url}`);
    return "linked";
  }

  await waitForIngestCapacity();

  const { buffer, contentType } = await downloadImage(pending.url);
  const tempStorageKey = `${randomUUID()}${resolveExtension(contentType, pending.url)}`;
  await imageTempStorageAdapter.put(tempStorageKey, buffer);

  const asset = await imageProcessingService.submitUploadForOwner({
    ownerId: pending.ownerId,
    tempStorageKey,
    qualityTier: "standard",
  });
  await pending.link(asset.id);
  return "linked";
};

const loadFallbackOwnerId = async (): Promise<string> => {
  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) {
    throw new Error("No ADMIN user found to own images whose brand/creator can't be resolved.");
  }
  return admin.id;
};

const collectPendingProductImages = async (
  fallbackOwnerId: string,
  remaining: number,
): Promise<PendingDomainImage[]> => {
  if (remaining <= 0) return [];
  const rows = await prisma.productImage.findMany({
    where: { imageAssetId: null },
    ...(Number.isFinite(remaining) ? { take: remaining } : {}),
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      url: true,
      product: {
        select: {
          brand: {
            select: {
              memberships: {
                where: { role: BrandRole.OWNER },
                take: 1,
                select: { userId: true },
              },
            },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    label: `product_image ${row.id}`,
    imageRowId: row.id,
    url: row.url,
    ownerId: row.product.brand.memberships[0]?.userId ?? fallbackOwnerId,
    link: (imageAssetId: string) =>
      prisma.productImage.update({ where: { id: row.id }, data: { imageAssetId } }),
  }));
};

const collectPendingLookImages = async (remaining: number): Promise<PendingDomainImage[]> => {
  if (remaining <= 0) return [];
  const rows = await prisma.creatorLookImage.findMany({
    where: { imageAssetId: null },
    ...(Number.isFinite(remaining) ? { take: remaining } : {}),
    orderBy: { createdAt: "asc" },
    select: { id: true, url: true, creatorLook: { select: { creatorId: true } } },
  });

  return rows.map((row) => ({
    label: `creator_look_image ${row.id}`,
    imageRowId: row.id,
    url: row.url,
    ownerId: row.creatorLook.creatorId,
    link: (imageAssetId: string) =>
      prisma.creatorLookImage.update({ where: { id: row.id }, data: { imageAssetId } }),
  }));
};

async function main() {
  console.warn(isDryRun ? "Dry run — no images will be processed." : "Backfilling image assets.");

  const fallbackOwnerId = await loadFallbackOwnerId();
  const productImages = await collectPendingProductImages(fallbackOwnerId, rowLimit);
  const lookImages = await collectPendingLookImages(rowLimit - productImages.length);
  const pending = [...productImages, ...lookImages];

  if (pending.length === 0) {
    console.warn("Nothing to backfill — every gallery image already links an asset.");
    return;
  }

  console.warn(
    `Found ${productImages.length} product image(s) and ${lookImages.length} look image(s) to link.`,
  );

  let linked = 0;
  let skipped = 0;
  let failed = 0;

  for (let start = 0; start < pending.length; start += BATCH_SIZE) {
    const batch = pending.slice(start, start + BATCH_SIZE);
    const outcomes = await Promise.allSettled(batch.map((image) => backfillImage(image)));

    outcomes.forEach((outcome, index) => {
      if (outcome.status === "rejected") {
        failed += 1;
        console.error(`  ${batch[index]?.label}: failed — ${String(outcome.reason)}`);
      } else if (outcome.value === "skipped") {
        skipped += 1;
      } else {
        linked += 1;
      }
    });

    console.warn(`  progress: ${linked} linked, ${skipped} skipped, ${failed} failed`);
    if (start + BATCH_SIZE < pending.length) await sleep(PAUSE_BETWEEN_BATCHES_MS);
  }

  console.warn(`Done. ${linked} linked, ${skipped} skipped, ${failed} failed.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeImageProcessingQueues(imageProcessingQueues);
    await prisma.$disconnect();
  });
