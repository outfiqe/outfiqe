import type { WebRevalidateTag } from "@outfiqe/utils";

import { env } from "#config/env.config.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

const REVALIDATE_ENDPOINT_PATH = "/internal/revalidate";

export const revalidateWebCache = async (tags: WebRevalidateTag[]): Promise<void> => {
  if (tags.length === 0) return;

  const secret = env.WEB_REVALIDATE_SECRET;
  if (!secret) return;

  const tagList = tags.join(", ");

  try {
    const response = await fetch(`${env.FRONTEND_URL}${REVALIDATE_ENDPOINT_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tags }),
    });

    if (!response.ok) {
      logger.warn(`Web cache revalidation for [${tagList}] returned status ${response.status}`);
    }
  } catch (err) {
    logger.warn(`Web cache revalidation for [${tagList}] failed: ${describeError(err)}`);
  }
};
