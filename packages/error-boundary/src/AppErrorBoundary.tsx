"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { ErrorBoundary, type FallbackProps, type OnErrorCallback } from "react-error-boundary";

import { ErrorFallback, isChunkLoadError } from "./ErrorFallback";

const CHUNK_RELOAD_STORAGE_KEY = "chunk-reload-attempted";
const DEFAULT_MAX_RETRIES = 3;

type AppErrorBoundaryProps = {
  children: ReactNode;
  resetKeys?: unknown[];
  maxRetries?: number;
  showDetails?: boolean;
  onReset?: () => void;
  onError?: OnErrorCallback;
};

export const AppErrorBoundary = ({
  children,
  resetKeys,
  maxRetries = DEFAULT_MAX_RETRIES,
  showDetails,
  onReset,
  onError,
}: AppErrorBoundaryProps) => {
  const retryCount = useRef(0);

  const renderFallback = (props: FallbackProps) => {
    if (isChunkLoadError(props.error) && !sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, "1");
      window.location.reload();
      return null;
    }

    const retriesExhausted = retryCount.current >= maxRetries;
    return (
      <ErrorFallback
        {...props}
        showDetails={showDetails}
        resetErrorBoundary={
          retriesExhausted ? () => window.location.reload() : props.resetErrorBoundary
        }
      />
    );
  };

  return (
    <ErrorBoundary
      FallbackComponent={renderFallback}
      resetKeys={resetKeys}
      onReset={() => {
        retryCount.current += 1;
        onReset?.();
      }}
      onError={(error, info) => {
        console.error("[ErrorBoundary]", error, info.componentStack);
        onError?.(error, info);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
