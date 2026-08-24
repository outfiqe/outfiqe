import type { BadgeAdmin } from "../../schemas";
import type { BadgeFormState } from "../badgeForm.types";
import type { BadgeStudioDraft } from "./badgeStudioDraft.types";

const BADGE_STUDIO_DRAFT_STORAGE_KEY = "outfiqe-admin:badge-studio-draft";

export const writeBadgeStudioDraft = (draft: BadgeStudioDraft): void => {
  try {
    sessionStorage.setItem(BADGE_STUDIO_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    return;
  }
};

export const readBadgeStudioDraft = (): BadgeStudioDraft | null => {
  try {
    const raw = sessionStorage.getItem(BADGE_STUDIO_DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BadgeStudioDraft) : null;
  } catch {
    return null;
  }
};

export const clearBadgeStudioDraft = (): void => {
  try {
    sessionStorage.removeItem(BADGE_STUDIO_DRAFT_STORAGE_KEY);
  } catch {
    return;
  }
};

export type EditingBadgeState = {
  badge: BadgeAdmin;
  formOverride?: { form: BadgeFormState; isActive: boolean; achievementIsActive: boolean };
};

export const resolveEditingBadgeFromDraft = (
  draft: BadgeStudioDraft | null,
): EditingBadgeState | null =>
  draft?.mode === "edit"
    ? {
        badge: draft.badge,
        formOverride: {
          form: draft.form,
          isActive: draft.isActive,
          achievementIsActive: draft.achievementIsActive,
        },
      }
    : null;

export const resolveCreateFormFromDraft = (
  draft: BadgeStudioDraft | null,
): BadgeFormState | null => (draft?.mode === "create" ? draft.form : null);
