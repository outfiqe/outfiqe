import "./config/load-env.js";

import * as Sentry from "@sentry/node";

import { APP_ENV } from "./config/app-env.js";
import {
  redactSensitiveQueryParams,
  redactSensitiveQueryString,
} from "./shared/utils/log-redaction.utils.js";

const SENTRY_TRACES_SAMPLE_RATE = 0.2;

const redactRequestQuery = <SentryEvent extends Sentry.Event>(event: SentryEvent): SentryEvent => {
  const { request } = event;
  if (!request) return event;
  const { url, query_string: queryString } = request;
  return {
    ...event,
    request: {
      ...request,
      url: url === undefined ? undefined : redactSensitiveQueryParams(url),
      query_string:
        typeof queryString === "string" ? redactSensitiveQueryString(queryString) : undefined,
    },
  };
};

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: APP_ENV,
    integrations: [Sentry.expressIntegration()],
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    beforeSend: redactRequestQuery,
    beforeSendTransaction: redactRequestQuery,
  });
}
