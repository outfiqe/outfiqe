"use client";

import { Button } from "@outfiqe/design-system";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { IS_PROD } from "@/shared/lib/appEnv";

interface HomeSectionErrorProps {
  sectionName: string;
  error: Error & { digest?: string };
  retry: () => void;
}

export const HomeSectionError = ({ sectionName, error, retry }: HomeSectionErrorProps) => {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <section className="px-6 py-10 sm:py-14 lg:px-10">
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6"
      >
        <div>
          <p className="font-display text-lg font-bold text-foreground">
            {sectionName} didn&apos;t load
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            The rest of the page is fine. You can try loading this section again.
          </p>
          {!IS_PROD && (
            <p className="mt-2 break-words font-mono text-xs text-muted-foreground">
              {error.message}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      </div>
    </section>
  );
};
