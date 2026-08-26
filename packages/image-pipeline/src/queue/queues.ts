import type { ConnectionOptions } from "bullmq";
import { Queue } from "bullmq";

import { IMAGE_QUEUE_NAMES } from "./queue-names.constants.js";

export type ImageProcessingQueues = {
  ingest: Queue;
  resize: Queue;
  optimize: Queue;
  thumbnail: Queue;
  cleanup: Queue;
  deadLetter: Queue;
};

export const createImageProcessingQueues = (
  connection: ConnectionOptions,
): ImageProcessingQueues => ({
  ingest: new Queue(IMAGE_QUEUE_NAMES.ingest, { connection }),
  resize: new Queue(IMAGE_QUEUE_NAMES.resize, { connection }),
  optimize: new Queue(IMAGE_QUEUE_NAMES.optimize, { connection }),
  thumbnail: new Queue(IMAGE_QUEUE_NAMES.thumbnail, { connection }),
  cleanup: new Queue(IMAGE_QUEUE_NAMES.cleanup, { connection }),
  deadLetter: new Queue(IMAGE_QUEUE_NAMES.deadLetter, { connection }),
});

export const closeImageProcessingQueues = async (queues: ImageProcessingQueues): Promise<void> => {
  await Promise.all(Object.values(queues).map((queue) => queue.close()));
};
