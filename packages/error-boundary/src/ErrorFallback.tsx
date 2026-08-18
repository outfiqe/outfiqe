"use client";

import { Button } from "@outfiqe/design-system";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { type FallbackProps, getErrorMessage } from "react-error-boundary";

const CHUNK_LOAD_ERROR_PATTERN =
  /ChunkLoadError|Loading chunk \d+ failed|dynamically imported module|Failed to fetch dynamically imported module/i;

export const isChunkLoadError = (error: unknown): boolean =>
  CHUNK_LOAD_ERROR_PATTERN.test(getErrorMessage(error) ?? "");

type ErrorFallbackProps = FallbackProps & {
  showDetails?: boolean;
};

export const ErrorFallback = ({ error, resetErrorBoundary, showDetails }: ErrorFallbackProps) => {
  const chunkError = isChunkLoadError(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const Icon = chunkError ? RefreshCw : AlertTriangle;

  return (
    <div
      role="alert"
      className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center"
    >
      <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <Icon className="size-8 text-destructive" />
      </div>
      <h2 className="mb-2 text-2xl font-semibold text-foreground sm:text-3xl">
        Something went wrong
      </h2>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        {chunkError
          ? "A new version was deployed. Please refresh the page."
          : "We've logged this error and our team will look into it."}
      </p>

      {showDetails && stack && (
        <pre className="mb-6 max-w-md overflow-x-auto rounded-md border border-border bg-muted p-3 text-left text-xs text-muted-foreground">
          {stack}
        </pre>
      )}

      <div className="flex justify-center gap-2">
        {chunkError ? (
          <Button onClick={() => window.location.reload()}>Reload page</Button>
        ) : (
          <>
            <Button onClick={resetErrorBoundary}>Try again</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
