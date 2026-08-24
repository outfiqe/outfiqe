import type { BadgeAdmin } from "../../schemas";
import type { BadgeFormState } from "../badgeForm.types";

export type BadgeStudioDraft =
  | { mode: "create"; form: BadgeFormState }
  | {
      mode: "edit";
      badge: BadgeAdmin;
      form: BadgeFormState;
      isActive: boolean;
      achievementIsActive: boolean;
    };
