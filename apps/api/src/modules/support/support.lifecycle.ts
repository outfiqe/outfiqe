import logger from "#lib/winston.utils.js";

import { RESOLVED_TICKET_AUTO_CLOSE_MS } from "./support.constants.js";
import { supportRepository } from "./support.repository.js";

export const runSupportAutoCloseSweep = async (): Promise<void> => {
  const cutoff = new Date(Date.now() - RESOLVED_TICKET_AUTO_CLOSE_MS);
  const closed = await supportRepository.closeStaleResolved(cutoff);
  if (closed > 0) logger.info(`Support auto-close: closed ${closed} stale resolved request(s).`);
};
