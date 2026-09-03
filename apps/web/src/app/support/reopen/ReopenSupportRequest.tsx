"use client";

import { Button } from "@outfiqe/design-system";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { supportApi } from "@/features/support";
import { getErrorMessage } from "@/shared/lib/errorMessages";

export const ReopenSupportRequest = () => {
  const token = useSearchParams().get("token");
  const reopen = useMutation({ mutationFn: () => supportApi.reopen(token ?? "") });

  if (!token) {
    return <p className="mt-3 text-sm text-destructive">This reopen link is missing its token.</p>;
  }

  if (reopen.isSuccess) {
    return (
      <div className="mt-3 space-y-3">
        <p className="text-sm text-foreground">
          {reopen.data.reference} is open again. Our team will pick it back up and reply by email.
        </p>
        <Link
          href="/settings/support"
          className="text-sm font-medium text-foreground underline underline-offset-2"
        >
          View your requests
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm text-muted-foreground">
        Still not sorted? Reopen the request and we&apos;ll take another look.
      </p>
      {reopen.isError && (
        <p className="text-sm text-destructive">{getErrorMessage(reopen.error)}</p>
      )}
      <Button onClick={() => reopen.mutate()} disabled={reopen.isPending}>
        {reopen.isPending ? "Reopening…" : "Reopen this request"}
      </Button>
    </div>
  );
};
