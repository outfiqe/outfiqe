"use client";

import { Modal, Skeleton } from "@outfiqe/design-system";

import { useLookDetail } from "../hooks/useLookDetail";
import { EditPostForm } from "./EditPostForm";

type EditPostModalProps = {
  lookId: string | null;
  onClose: () => void;
};

export const EditPostModal = ({ lookId, onClose }: EditPostModalProps) => {
  const open = lookId !== null;
  const lookDetail = useLookDetail(lookId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit post"
      description="Update your photos, caption, and tagged pieces."
      className="sm:max-w-lg"
    >
      {lookId && lookDetail.data ? (
        <EditPostForm key={lookId} lookId={lookId} detail={lookDetail.data} onClose={onClose} />
      ) : (
        <EditPostModalSkeleton isError={lookDetail.isError} />
      )}
    </Modal>
  );
};

const EditPostModalSkeleton = ({ isError }: { isError: boolean }) =>
  isError ? (
    <p className="py-8 text-center text-sm text-muted-foreground">Couldn&apos;t load this post.</p>
  ) : (
    <div className="space-y-5" aria-hidden>
      <div className="flex gap-2">
        <Skeleton className="size-20 shrink-0 rounded-xl" />
        <Skeleton className="size-20 shrink-0 rounded-xl" />
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-10 w-40 rounded-full" />
      <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
        <Skeleton className="h-11 w-20 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
    </div>
  );
