import * as Sentry from "@sentry/nextjs";

import { APP_ENV } from "@/shared/lib/appEnv";

const SENTRY_TRACES_SAMPLE_RATE = 0.2;

export const register = () => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: APP_ENV,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  });
};

export const onRequestError = Sentry.captureRequestError;
