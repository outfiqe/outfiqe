import { Badge, Button } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { ridersApi } from "../api/ridersApi";
import type { Rider, RiderStatus } from "../api/ridersSchemas";
import {
  IDENTITY_DOCUMENT_TYPE_LABELS,
  RIDER_EMPLOYMENT_TYPE_LABELS,
  RIDER_STATUS_LABELS,
  RIDER_STATUS_TONES,
} from "../constants/riderLabels";
import { RIDERS_QUERY_KEY } from "../constants/riderQueryKeys";
import { listRiderStatusActions, needsIdentityCheck } from "../utils/riderActions.utils";
import { IdentityCheckModal } from "./IdentityCheckModal";

type RiderCardProps = {
  rider: Rider;
  canManage: boolean;
};

export const RiderCard = ({ rider, canManage }: RiderCardProps) => {
  const [isIdentityCheckOpen, setIsIdentityCheckOpen] = useState(false);
  const {
    name,
    email,
    phone,
    employmentType,
    status,
    identityDocumentType,
    identityDocumentLast4,
  } = rider;

  const changeStatus = useApiMutation({
    errorMessage: getErrorMessage,
    mutationFn: (nextStatus: RiderStatus) => ridersApi.setStatus(rider.id, nextStatus),
    invalidateKeys: [RIDERS_QUERY_KEY],
    successMessage: "Rider updated.",
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{name}</p>
            <Badge tone={RIDER_STATUS_TONES[status]}>{RIDER_STATUS_LABELS[status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {RIDER_EMPLOYMENT_TYPE_LABELS[employmentType]} · {email}
            {phone ? ` · ${phone}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {identityDocumentType && identityDocumentLast4
              ? `ID checked: ${IDENTITY_DOCUMENT_TYPE_LABELS[identityDocumentType]} ending ${identityDocumentLast4}`
              : "ID not checked yet"}
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            {needsIdentityCheck(rider) && (
              <Button size="sm" onClick={() => setIsIdentityCheckOpen(true)}>
                Check ID
              </Button>
            )}
            {listRiderStatusActions(rider).map(({ label, nextStatus }) => (
              <Button
                key={nextStatus}
                size="sm"
                variant="outline"
                disabled={changeStatus.isPending}
                onClick={() => changeStatus.mutate(nextStatus)}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isIdentityCheckOpen && (
        <IdentityCheckModal rider={rider} onClose={() => setIsIdentityCheckOpen(false)} />
      )}
    </div>
  );
};
