import * as Sentry from "@sentry/nextjs";

import { APP_ENV } from "@/shared/lib/appEnv";

const SENTRY_TRACES_SAMPLE_RATE = 0.2;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: APP_ENV,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  });
}
