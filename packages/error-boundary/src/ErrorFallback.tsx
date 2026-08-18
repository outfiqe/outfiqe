"use client";

import { Button } from "@outfiqe/design-system";
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

  return (
    <div role="alert" className="mx-auto my-10 max-w-md px-6 text-center">
      <h2 className="mb-2 text-xl font-semibold text-foreground">Something went wrong</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {chunkError
          ? "A new version was deployed. Please refresh the page."
          : "We've logged this error and our team will look into it."}
      </p>

      {showDetails && stack && (
        <pre className="mb-4 overflow-x-auto rounded-md border border-border bg-muted p-3 text-left text-xs text-muted-foreground">
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
