"use client";

import { ErrorFallback } from "@outfiqe/error-boundary";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

const Error = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      resetErrorBoundary={reset}
      showDetails={process.env.NODE_ENV === "development"}
    />
  );
};

export default Error;
