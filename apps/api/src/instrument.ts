import "dotenv/config";

import * as Sentry from "@sentry/node";

const SENTRY_TRACES_SAMPLE_RATE = 0.2;

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [Sentry.expressIntegration()],
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  });
}
