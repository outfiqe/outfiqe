"use client";

import { Button, Input, Label, Modal, Select } from "@outfiqe/design-system";
import { OUTFIT_ITEMS_PER_MEMBER_CHOICES } from "@outfiqe/utils";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

const NO_LIMIT_VALUE = "";
const TITLE_MAX_LENGTH = 80;
const DECIMAL_RADIX = 10;
const EMPTY_TITLE_LENGTH = 0;

type BoardSettings = {
  title: string | null;
  budget: number | null;
  maxItemsPerMember: number | null;
};

type BoardSettingsModalProps = {
  settings: BoardSettings;
  isSaving: boolean;
  onSave: (changes: BoardSettings) => Promise<boolean>;
  onClose: () => void;
};

const toOptionalNumber = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === NO_LIMIT_VALUE) return null;
  const parsed = Number.parseInt(trimmed, DECIMAL_RADIX);
  return Number.isNaN(parsed) ? null : parsed;
};

export const BoardSettingsModal = ({
  settings,
  isSaving,
  onSave,
  onClose,
}: BoardSettingsModalProps) => {
  const t = useTranslations("outfitBuild.settings");
  const titleId = useId();
  const budgetId = useId();
  const perPersonId = useId();
  const [title, setTitle] = useState(settings.title ?? "");
  const [budgetText, setBudgetText] = useState(settings.budget?.toString() ?? NO_LIMIT_VALUE);
  const [perPersonText, setPerPersonText] = useState(
    settings.maxItemsPerMember?.toString() ?? NO_LIMIT_VALUE,
  );

  const saveSettings = async () => {
    const trimmedTitle = title.trim();
    const isSaved = await onSave({
      title: trimmedTitle.length > EMPTY_TITLE_LENGTH ? trimmedTitle : null,
      budget: toOptionalNumber(budgetText),
      maxItemsPerMember: toOptionalNumber(perPersonText),
    });
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
          <Button onClick={() => void saveSettings()} isLoading={isSaving}>
            {t("save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={titleId}>{t("buildName")}</Label>
          <Input
            id={titleId}
            value={title}
            maxLength={TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("buildNamePlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={budgetId}>{t("budget")}</Label>
          <Input
            id={budgetId}
            type="number"
            inputMode="numeric"
            min={0}
            value={budgetText}
            onChange={(event) => setBudgetText(event.target.value)}
            placeholder={t("noBudget")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={perPersonId}>{t("perPerson")}</Label>
          <Select
            id={perPersonId}
            value={perPersonText}
            onChange={(event) => setPerPersonText(event.target.value)}
          >
            <option value={NO_LIMIT_VALUE}>{t("noLimit")}</option>
            {OUTFIT_ITEMS_PER_MEMBER_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {t("itemsEach", { count: choice })}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">{t("perPersonHint")}</p>
        </div>
      </div>
    </Modal>
  );
};
