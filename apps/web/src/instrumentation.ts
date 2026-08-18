import * as Sentry from "@sentry/nextjs";

const SENTRY_TRACES_SAMPLE_RATE = 0.2;

export const register = () => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  });
};

export const onRequestError = Sentry.captureRequestError;
