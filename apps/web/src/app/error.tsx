"use client";

import { ErrorFallback } from "@outfiqe/error-boundary";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { IS_PROD } from "@/shared/lib/appEnv";

const Error = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <ErrorFallback error={error} resetErrorBoundary={reset} showDetails={!IS_PROD} />;
};

export default Error;
