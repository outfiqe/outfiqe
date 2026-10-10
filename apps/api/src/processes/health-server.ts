import { createServer } from "node:http";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { checkReadiness } from "#lib/readiness.utils.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

export type HealthServer = {
  close: () => Promise<void>;
};

export const startHealthServer = (port: number, role: string): HealthServer => {
  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(HTTP_STATUS.OK, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", role }));
      return;
    }

    if (req.url === "/ready") {
      void checkReadiness()
        .then(() => {
          res.writeHead(HTTP_STATUS.OK, { "content-type": "application/json" });
          res.end(JSON.stringify({ status: "ready", role }));
        })
        .catch((error: unknown) => {
          logger.error(`Readiness check failed (${role}): ${describeError(error)}`);
          res.writeHead(HTTP_STATUS.SERVICE_UNAVAILABLE, { "content-type": "application/json" });
          res.end(JSON.stringify({ status: "not-ready", role }));
        });
      return;
    }

    res.writeHead(HTTP_STATUS.NOT_FOUND);
    res.end();
  });

  server.listen(port, () => {
    logger.info(`${role} health server listening on http://localhost:${port}`);
  });

  return {
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
