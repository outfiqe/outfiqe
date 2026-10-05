"use client";

import { Button, Modal } from "@outfiqe/design-system";
import type { ChatContact } from "@outfiqe/types";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ContactPicker } from "@/features/messaging";

type InviteEditorsModalProps = {
  memberIds: string[];
  openSeats: number;
  isSaving: boolean;
  onInvite: (userIds: string[]) => Promise<boolean>;
  onClose: () => void;
};

const NO_SEATS = 0;

export const InviteEditorsModal = ({
  memberIds,
  openSeats,
  isSaving,
  onInvite,
  onClose,
}: InviteEditorsModalProps) => {
  const t = useTranslations("outfitBuild.people");
  const [selectedContacts, setSelectedContacts] = useState<ChatContact[]>([]);

  const inviteSelected = async () => {
    const isInvited = await onInvite(selectedContacts.map(({ id }) => id));
    if (isInvited) onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("inviteTitle")}
      description={t("inviteDescription", { seats: openSeats })}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => void inviteSelected()}
            disabled={selectedContacts.length === NO_SEATS}
            isLoading={isSaving}
          >
            {t("invite")}
          </Button>
        </div>
      }
    >
      {openSeats > NO_SEATS ? (
        <ContactPicker
          selectedContacts={selectedContacts}
          onChange={setSelectedContacts}
          excludedUserIds={memberIds}
          maxSelectable={openSeats}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t("boardFull")}</p>
      )}
    </Modal>
  );
};
