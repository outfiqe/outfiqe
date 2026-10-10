"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { isServiceWorkerErrorReport } from "../constants/serviceWorkerError";

const toReportedError = (message: string, stack: string | undefined): Error => {
  const error = new Error(message);
  if (stack) error.stack = stack;
  return error;
};

export const ServiceWorkerErrorReporter = () => {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const { serviceWorker } = navigator;

    const reportServiceWorkerErrorToSentry = (event: MessageEvent<unknown>) => {
      if (!isServiceWorkerErrorReport(event.data)) return;

      Sentry.captureException(toReportedError(event.data.message, event.data.stack), {
        tags: { source: "service-worker", context: event.data.context },
      });
    };

    serviceWorker.addEventListener("message", reportServiceWorkerErrorToSentry);
    return () => serviceWorker.removeEventListener("message", reportServiceWorkerErrorToSentry);
  }, []);

  return null;
};
