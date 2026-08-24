import logger from "./winston.utils.js";

export const settleIds = async (
  ids: string[],
  settle: (id: string) => Promise<boolean>,
  onError: (id: string, error: unknown) => string,
): Promise<number> => {
  let count = 0;
  for (const id of ids) {
    try {
      if (await settle(id)) count += 1;
    } catch (error) {
      logger.error(onError(id, error));
    }
  }
  return count;
};
