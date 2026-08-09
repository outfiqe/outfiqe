"use client";

import { Button } from "@/design-system/components/ui/button";
import { useApplyAsCreator } from "../hooks/useApplyAsCreator";

export function ApplyAsCreatorButton() {
  const apply = useApplyAsCreator();

  return (
    <div>
      <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
        {apply.isPending ? "Applying…" : "Apply to become a creator"}
      </Button>
      {apply.isError && <p className="mt-2 text-sm text-destructive">{apply.error.message}</p>}
    </div>
  );
}
