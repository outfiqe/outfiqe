"use client";

import { ErrorFallback } from "@outfiqe/error-boundary";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

const GlobalError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorFallback
          error={error}
          resetErrorBoundary={reset}
          showDetails={process.env.NODE_ENV === "development"}
        />
      </body>
    </html>
  );
};

export default GlobalError;
