import { createServer } from "node:http";

import { checkReadiness } from "#lib/readiness.utils.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

const OK_STATUS = 200;
const SERVICE_UNAVAILABLE_STATUS = 503;
const NOT_FOUND_STATUS = 404;

export type HealthServer = {
  close: () => Promise<void>;
};

export const startHealthServer = (port: number, role: string): HealthServer => {
  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(OK_STATUS, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", role }));
      return;
    }

    if (req.url === "/ready") {
      void checkReadiness()
        .then(() => {
          res.writeHead(OK_STATUS, { "content-type": "application/json" });
          res.end(JSON.stringify({ status: "ready", role }));
        })
        .catch((error: unknown) => {
          logger.error(`Readiness check failed (${role}): ${describeError(error)}`);
          res.writeHead(SERVICE_UNAVAILABLE_STATUS, { "content-type": "application/json" });
          res.end(JSON.stringify({ status: "not-ready", role }));
        });
      return;
    }

    res.writeHead(NOT_FOUND_STATUS);
    res.end();
  });

  server.listen(port, () => {
    logger.info(`${role} health server listening on http://localhost:${port}`);
  });

  return {
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
