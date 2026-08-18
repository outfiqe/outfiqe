import { ErrorFallback } from "@outfiqe/error-boundary";
import * as Sentry from "@sentry/react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

export const RouteError = ({ error, reset }: ErrorComponentProps) => {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorFallback error={error} resetErrorBoundary={reset} showDetails={import.meta.env.DEV} />
  );
};
