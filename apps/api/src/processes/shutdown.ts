import * as Sentry from "@sentry/node";

import logger from "#lib/winston.utils.js";

const SENTRY_SHUTDOWN_FLUSH_TIMEOUT_MS = 2000;

export type ShutdownStep = {
  name: string;
  run: () => Promise<void> | void;
};

export const registerGracefulShutdown = (steps: ShutdownStep[]): void => {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully`);

    for (const step of steps) {
      try {
        await step.run();
      } catch (error) {
        logger.error(`Shutdown step "${step.name}" failed: ${String(error)}`);
      }
    }

    await Sentry.close(SENTRY_SHUTDOWN_FLUSH_TIMEOUT_MS);
    process.exit(0);
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => void shutdown(signal));
  }
};
