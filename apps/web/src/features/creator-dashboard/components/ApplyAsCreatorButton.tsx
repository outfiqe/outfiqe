"use client";

import { Button } from "@outfiqe/design-system";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useApplyAsCreator } from "../hooks/useApplyAsCreator";

export const ApplyAsCreatorButton = () => {
  const apply = useApplyAsCreator();

  if (apply.isSuccess) {
    return (
      <p className="text-sm text-muted-foreground">
        Application submitted — we&apos;ll email you once it&apos;s reviewed.
      </p>
    );
  }

  return (
    <div>
      <Button onClick={() => apply.mutate()} isLoading={apply.isPending} disabled={apply.isPending}>
        Apply to become a creator
      </Button>
      {apply.isError && (
        <p className="mt-2 text-sm text-destructive">{getErrorMessage(apply.error)}</p>
      )}
    </div>
  );
};
