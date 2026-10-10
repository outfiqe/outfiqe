"use client";

import { Button, FormBanner, Input, Label, Modal } from "@outfiqe/design-system";
import { useCreateGroup } from "@outfiqe/hooks";
import type { ChatContact } from "@outfiqe/types";
import { type FormEvent, useId, useState } from "react";

import { conversationsApi } from "@/shared/lib/conversationsApi";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import {
  GROUP_NAME_MAX_LENGTH,
  MAX_PEOPLE_PER_GROUP_CHANGE,
} from "../constants/messaging.constants";
import { ContactPicker } from "./ContactPicker";

type NewGroupModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
};

export const NewGroupModal = ({ open, onClose, onCreated }: NewGroupModalProps) => {
  const nameInputId = useId();
  const [groupName, setGroupName] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<ChatContact[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const createGroup = useCreateGroup(conversationsApi);

  const trimmedName = groupName.trim();
  const canCreate = trimmedName.length > 0 && selectedContacts.length > 0;

  const resetForm = (): void => {
    setGroupName("");
    setSelectedContacts([]);
    setIdempotencyKey(crypto.randomUUID());
    createGroup.reset();
  };

  const closeModal = (): void => {
    resetForm();
    onClose();
  };

  const submitNewGroup = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!canCreate) return;
    createGroup.mutate(
      {
        input: { name: trimmedName, memberIds: selectedContacts.map(({ id }) => id) },
        idempotencyKey,
      },
      {
        onSuccess: (conversation) => {
          resetForm();
          onCreated(conversation.id);
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="New group"
      description="Name your group and pick who to add. You'll be its admin."
    >
      <form onSubmit={submitNewGroup} className="space-y-4">
        {createGroup.isError && (
          <FormBanner tone="negative">{getErrorMessage(createGroup.error)}</FormBanner>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={nameInputId}>Group name</Label>
          <Input
            id={nameInputId}
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            maxLength={GROUP_NAME_MAX_LENGTH}
            placeholder="For example, Dashain outfits"
            required
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">People</p>
          <ContactPicker
            selectedContacts={selectedContacts}
            onChange={setSelectedContacts}
            maxSelectable={MAX_PEOPLE_PER_GROUP_CHANGE}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeModal}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canCreate} isLoading={createGroup.isPending}>
            Create group
          </Button>
        </div>
      </form>
    </Modal>
  );
};
