import * as Sentry from "@sentry/nextjs";

const SENTRY_TRACES_SAMPLE_RATE = 0.2;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  });
}
