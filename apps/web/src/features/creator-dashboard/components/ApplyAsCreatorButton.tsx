"use client";

import { Button } from "@outfiqe/design-system";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useApplyAsCreator } from "../hooks/useApplyAsCreator";

export const ApplyAsCreatorButton = () => {
  const apply = useApplyAsCreator();

  return (
    <div>
      <Button onClick={() => apply.mutate()} isLoading={apply.isPending}>
        Apply to become a creator
      </Button>
      {apply.isError && (
        <p className="mt-2 text-sm text-destructive">{getErrorMessage(apply.error)}</p>
      )}
    </div>
  );
};
