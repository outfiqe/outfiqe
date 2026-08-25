import type { ConnectionOptions } from "bullmq";
import { FlowProducer } from "bullmq";

import type { QualityTier } from "../processing/image-processing.types.js";
import { buildIdempotentJobId } from "./job-id.utils.js";
import { buildImageJobOptions } from "./job-options.js";
import type { ImageJobPriorityTier } from "./priority.constants.js";
import { IMAGE_QUEUE_NAMES } from "./queue-names.constants.js";

export type EnqueueImageProcessingParams = {
  assetId: string;
  ownerId: string;
  checksum: string;
  tempStorageKey: string;
  priorityTier: ImageJobPriorityTier;
  qualityTier: QualityTier;
};

export const enqueueImageProcessing = async (
  connection: ConnectionOptions,
  params: EnqueueImageProcessingParams,
): Promise<void> => {
  const { assetId, ownerId, checksum, tempStorageKey, priorityTier, qualityTier } = params;

  const flowProducer = new FlowProducer({ connection });
  try {
    const ingestJobId = buildIdempotentJobId({ checksum, stage: "ingest" });
    const resizeJobId = buildIdempotentJobId({ checksum, stage: "resize" });
    const optimizeJobId = buildIdempotentJobId({ checksum, stage: "optimize" });

    await flowProducer.add({
      name: "optimize",
      queueName: IMAGE_QUEUE_NAMES.optimize,
      data: { assetId },
      opts: buildImageJobOptions(optimizeJobId, priorityTier),
      children: [
        {
          name: "resize",
          queueName: IMAGE_QUEUE_NAMES.resize,
          data: { assetId },
          opts: buildImageJobOptions(resizeJobId, priorityTier),
          children: [
            {
              name: "ingest",
              queueName: IMAGE_QUEUE_NAMES.ingest,
              data: { assetId, ownerId, tempStorageKey, checksum, priorityTier, qualityTier },
              opts: buildImageJobOptions(ingestJobId, priorityTier),
            },
          ],
        },
      ],
    });
  } finally {
    await flowProducer.close();
  }
};
