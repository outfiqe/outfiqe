import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { imageProcessingQueues } from "./image-processing.queue.js";

const BULL_BOARD_BASE_PATH = "/internal/queues";

export const createImageProcessingBullBoardRouter = () => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(BULL_BOARD_BASE_PATH);

  createBullBoard({
    queues: Object.values(imageProcessingQueues).map((queue) => new BullMQAdapter(queue)),
    serverAdapter,
  });

  return serverAdapter.getRouter();
};
