"use client";

import { Button } from "@outfiqe/design-system";

import type { RiderTaskStop } from "../api/riderSchemas";
import { RETURN_SOURCE_LABELS } from "../constants/riderTaskLabels";
import { useDropOffReturn } from "../hooks/useDropOffReturn";
import { formatShortOrderId } from "../utils/riderTask.utils";

type ReturnStopsSectionProps = {
  taskId: string;
  returnStops: RiderTaskStop[];
  isVisitOpen: boolean;
};

export const ReturnStopsSection = ({
  taskId,
  returnStops,
  isVisitOpen,
}: ReturnStopsSectionProps) => {
  const dropOffReturn = useDropOffReturn(taskId);

  return (
    <section aria-labelledby="returns-heading" className="mt-4">
      <h2 id="returns-heading" className="font-semibold text-foreground">
        Hand back to the brand
      </h2>
      <p className="text-sm text-muted-foreground">
        Give these to the brand and ask them to check the items.
      </p>
      <ul className="mt-2 space-y-2">
        {returnStops.flatMap(({ id, isCollected, brandReturn }) =>
          brandReturn
            ? [
                <li
                  key={id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span>
                    Order {formatShortOrderId(brandReturn.orderId)} · {brandReturn.unitCount}{" "}
                    unit(s) · {RETURN_SOURCE_LABELS[brandReturn.source]}
                  </span>
                  {isCollected ? (
                    <span className="font-medium text-foreground">Handed over</span>
                  ) : (
                    isVisitOpen && (
                      <Button
                        size="sm"
                        onClick={() => dropOffReturn.mutate(brandReturn.brandReturnId)}
                        isLoading={
                          dropOffReturn.isPending &&
                          dropOffReturn.variables === brandReturn.brandReturnId
                        }
                      >
                        Handed to the brand
                      </Button>
                    )
                  )}
                </li>,
              ]
            : [],
        )}
      </ul>
    </section>
  );
};
