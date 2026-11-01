import { BAG_TAG_CODE_LENGTH } from "@outfiqe/utils";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { generateRandomCode } from "#lib/random-code.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import type { DbClient } from "#types/db.types.js";

import { logisticsErrors } from "../logistics.errors.js";
import { logisticsRiderRepository } from "../riders/rider.repository.js";
import { logisticsBagTagRepository } from "./bag-tag.repository.js";
import type { CreateBagTagBatchBody, ListBagTagBatchesQuery } from "./bag-tag.schemas.js";
import type { BagTagBatchSheet, BagTagBatchSummary } from "./bag-tag.types.js";
import { toBagTagBatchSummary } from "./bag-tag.utils.js";

const MAX_CODE_GENERATION_ROUNDS = 5;
const NO_TAGS_INSERTED = 0;
const FIRST_ROUND = 1;
const NEXT_ROUND_STEP = 1;

const generateCodes = (count: number) =>
  Array.from({ length: count }, () => generateRandomCode(BAG_TAG_CODE_LENGTH));

const insertUniqueBagTags = async (
  client: DbClient,
  batchId: string,
  tagCount: number,
): Promise<number> => {
  let insertedCount = NO_TAGS_INSERTED;
  for (
    let round = FIRST_ROUND;
    round <= MAX_CODE_GENERATION_ROUNDS && insertedCount < tagCount;
    round += NEXT_ROUND_STEP
  ) {
    insertedCount += await logisticsBagTagRepository.insertBagTags(
      client,
      batchId,
      generateCodes(tagCount - insertedCount),
    );
  }
  return insertedCount;
};

const requireBatchSheet = async (batchId: string) => {
  const batch = await logisticsBagTagRepository.findBagTagBatchWithTags(batchId);
  if (!batch) {
    throw new AppError(
      "BAG_TAG_BATCH_NOT_FOUND",
      "Sticker batch not found.",
      HTTP_STATUS.NOT_FOUND,
    );
  }
  return batch;
};

const toBatchSheet = (batch: Awaited<ReturnType<typeof requireBatchSheet>>): BagTagBatchSheet => ({
  ...toBagTagBatchSummary(batch),
  tags: batch.tags.map(({ code, fulfilmentGroupId }) => ({
    code,
    isUsed: fulfilmentGroupId !== null,
  })),
});

export const logisticsBagTagService = {
  async createBagTagBatch(
    { hubId, tagCount }: CreateBagTagBatchBody,
    createdById: string,
  ): Promise<BagTagBatchSheet> {
    if (!(await logisticsRiderRepository.findActiveHub(hubId))) {
      throw logisticsErrors.hubNotOpen();
    }

    const batchId = await prisma.$transaction(async (tx) => {
      const { id } = await logisticsBagTagRepository.createBagTagBatch(tx, {
        hubId,
        tagCount,
        createdById,
      });
      if ((await insertUniqueBagTags(tx, id, tagCount)) < tagCount) {
        throw new AppError(
          "BAG_TAG_CODES_EXHAUSTED",
          "We couldn't make enough unique sticker codes. Please try again.",
          HTTP_STATUS.CONFLICT,
        );
      }
      return id;
    });

    return toBatchSheet(await requireBatchSheet(batchId));
  },

  async listBagTagBatches(
    query: ListBagTagBatchesQuery,
  ): Promise<{ items: BagTagBatchSummary[]; nextCursor: string | null }> {
    const batches = await logisticsBagTagRepository.listBagTagBatches(query);
    const { items, nextCursor } = buildCursorPage(batches, query.limit, (batch) => batch.id);
    return { items: items.map(toBagTagBatchSummary), nextCursor };
  },

  async getBagTagBatchSheet(batchId: string): Promise<BagTagBatchSheet> {
    return toBatchSheet(await requireBatchSheet(batchId));
  },
};
