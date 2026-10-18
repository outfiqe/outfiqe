"use client";

import { Button, FormBanner, Modal, toast } from "@outfiqe/design-system";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useFinishVisit } from "../hooks/useFinishVisit";

type LeaveVisitModalProps = {
  taskId: string;
  uncollectedBagCount: number;
  open: boolean;
  onClose: () => void;
};

const SINGLE_BAG = 1;

export const LeaveVisitModal = ({
  taskId,
  uncollectedBagCount,
  open,
  onClose,
}: LeaveVisitModalProps) => {
  const finishVisit = useFinishVisit(taskId);
  const bagsLeftLabel =
    uncollectedBagCount === SINGLE_BAG
      ? "1 bag that isn't ready"
      : `${uncollectedBagCount} bags that aren't ready`;

  const leaveVisit = () => {
    finishVisit.mutate(undefined, {
      onSuccess: () => {
        toast.success("Visit finished. Bags not ready go back on the board.");
        onClose();
      },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Leave without the rest?"
      description={`You'll finish this visit and leave ${bagsLeftLabel}. They go back on the pickup board for another round. You can't undo this.`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Stay
          </Button>
          <Button onClick={leaveVisit} isLoading={finishVisit.isPending}>
            Leave
          </Button>
        </div>
      }
    >
      {finishVisit.isError && <FormBanner>{getErrorMessage(finishVisit.error)}</FormBanner>}
    </Modal>
  );
};
