import { ErrorFallback } from "@outfiqe/error-boundary";
import * as Sentry from "@sentry/react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

import { IS_PROD } from "@/lib/appEnv";

export const RouteError = ({ error, reset }: ErrorComponentProps) => {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <ErrorFallback error={error} resetErrorBoundary={reset} showDetails={!IS_PROD} />;
};
