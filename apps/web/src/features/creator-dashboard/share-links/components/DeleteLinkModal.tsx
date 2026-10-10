"use client";

import { Button, Modal, toast } from "@outfiqe/design-system";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { CreatorLink } from "../api/creatorLinksSchemas";
import { useDeleteCreatorLink } from "../hooks/useDeleteCreatorLink";

type DeleteLinkModalProps = {
  link: CreatorLink;
  onClose: () => void;
  onDeleted: (link: CreatorLink) => void;
};

export const DeleteLinkModal = ({ link, onClose, onDeleted }: DeleteLinkModalProps) => {
  const deleteLink = useDeleteCreatorLink();

  const confirmDelete = async () => {
    try {
      await deleteLink.mutateAsync(link.id);
      toast.success("Link deleted");
      onDeleted(link);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal open onClose={onClose} title="Delete link" ariaLabel="Delete link">
      <p className="text-sm text-muted-foreground">
        Delete this link? It stops working right away, and anyone who opens it will see that it is
        no longer available. Clicks and commission you have already earned from it are kept.
      </p>
      <div className="mt-6 flex justify-end gap-2.5">
        <Button type="button" variant="outline" onClick={onClose} disabled={deleteLink.isPending}>
          Cancel
        </Button>
        <Button type="button" onClick={confirmDelete} isLoading={deleteLink.isPending}>
          Delete
        </Button>
      </div>
    </Modal>
  );
};
