import "./config/load-env.js";

import * as Sentry from "@sentry/node";

import { APP_ENV } from "./config/app-env.js";

const SENTRY_TRACES_SAMPLE_RATE = 0.2;

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: APP_ENV,
    integrations: [Sentry.expressIntegration()],
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  });
}
