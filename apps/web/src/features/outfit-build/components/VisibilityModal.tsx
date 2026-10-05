"use client";

import { Button, Modal, RadioGroup } from "@outfiqe/design-system";
import type { ChatContact } from "@outfiqe/types";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ContactPicker } from "@/features/messaging";

import type { OutfitVisibility } from "../api/outfitSchemas";

const VISIBILITY_OPTIONS: OutfitVisibility[] = ["PRIVATE", "SHARED", "PUBLIC"];
const MAX_SHARES_PER_REQUEST = 50;
const NO_RECIPIENTS = 0;

type VisibilityModalProps = {
  currentVisibility: OutfitVisibility;
  memberIds: string[];
  hasBeenLocked: boolean;
  isSaving: boolean;
  onSave: (
    visibility: OutfitVisibility,
    shareWithUserIds: string[] | undefined,
  ) => Promise<boolean>;
  onClose: () => void;
};

export const VisibilityModal = ({
  currentVisibility,
  memberIds,
  hasBeenLocked,
  isSaving,
  onSave,
  onClose,
}: VisibilityModalProps) => {
  const t = useTranslations("outfitBuild.visibility");
  const [visibility, setVisibility] = useState<OutfitVisibility>(currentVisibility);
  const [recipients, setRecipients] = useState<ChatContact[]>([]);
  const needsLock = visibility !== "PRIVATE" && !hasBeenLocked;

  const saveVisibility = async () => {
    const shareWithUserIds =
      visibility === "SHARED" && recipients.length > NO_RECIPIENTS
        ? recipients.map(({ id }) => id)
        : undefined;
    const isSaved = await onSave(visibility, shareWithUserIds);
    if (isSaved) onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("title")}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void saveVisibility()} disabled={needsLock} isLoading={isSaving}>
            {t("save")}
          </Button>
        </div>
      }
    >
      <RadioGroup
        legend={t("title")}
        value={visibility}
        onChange={setVisibility}
        options={VISIBILITY_OPTIONS.map((option) => ({
          value: option,
          label: t(`options.${option}.label`),
          description: t(`options.${option}.description`),
        }))}
      />

      {needsLock && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {t("lockFirst")}
        </p>
      )}

      {visibility === "SHARED" && !needsLock && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-foreground">{t("sendTo")}</p>
          <ContactPicker
            selectedContacts={recipients}
            onChange={setRecipients}
            excludedUserIds={memberIds}
            maxSelectable={MAX_SHARES_PER_REQUEST}
          />
        </div>
      )}
    </Modal>
  );
};
