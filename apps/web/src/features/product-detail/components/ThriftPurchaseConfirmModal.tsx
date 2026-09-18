"use client";

import { Button, Modal } from "@outfiqe/design-system";
import { THRIFT_CONDITION_LABEL, type ThriftCondition } from "@outfiqe/utils";

import { cn } from "@/shared/lib/cn";

type ThriftPurchaseConfirmModalProps = {
  conditionRating: ThriftCondition | null;
  conditionNotes: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ThriftPurchaseConfirmModal = ({
  conditionRating,
  conditionNotes,
  onConfirm,
  onCancel,
}: ThriftPurchaseConfirmModalProps) => (
  <Modal
    open
    onClose={onCancel}
    title="You're buying a secondhand piece"
    footer={
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>I understand, continue</Button>
      </div>
    }
  >
    <div className="space-y-3 text-sm text-foreground">
      <p>
        This is a pre-owned, one-of-a-kind piece — there&apos;s only ever one unit, and it
        won&apos;t restock once it sells.
      </p>

      {(conditionRating || conditionNotes) && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          {conditionRating && (
            <p className="text-xs font-bold uppercase tracking-wide text-thrift-strong">
              Condition: {THRIFT_CONDITION_LABEL[conditionRating]}
            </p>
          )}
          {conditionNotes && (
            <p className={cn("text-muted-foreground", conditionRating && "mt-1")}>
              {conditionNotes}
            </p>
          )}
        </div>
      )}

      <p className="text-muted-foreground">
        By continuing, you confirm you&apos;ve read the seller&apos;s condition notes above and
        you&apos;re buying it as described.
      </p>
    </div>
  </Modal>
);
