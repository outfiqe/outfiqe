import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { BADGE_DESIGN_MODE } from "../../badgeOptions.constants";
import type { BadgeFormState } from "../badgeForm.types";
import { readBadgeStudioDraft, writeBadgeStudioDraft } from "./badgeStudioDraft.utils";
import { DesignStudio } from "./DesignStudio";

const FALLBACK_BADGE_ICON = "🏆";

export const BadgeDesignStudioPage = () => {
  const navigate = useNavigate();
  const [draft] = useState(readBadgeStudioDraft);

  useEffect(() => {
    if (!draft) void navigate({ to: "/gamification/badges", replace: true });
  }, [draft, navigate]);

  const resumeWithForm = (form: BadgeFormState) => {
    if (draft) writeBadgeStudioDraft({ ...draft, form });
    void navigate({ to: "/gamification/badges" });
  };

  if (!draft) return null;

  return (
    <DesignStudio
      icon={draft.form.icon || FALLBACK_BADGE_ICON}
      rarity={draft.form.rarity}
      initialLayers={draft.form.studioLayers}
      initialAnimation={draft.form.animation}
      onCancel={() => resumeWithForm(draft.form)}
      onDone={(layers, animation) =>
        resumeWithForm({
          ...draft.form,
          designMode: BADGE_DESIGN_MODE.STUDIO,
          studioLayers: layers,
          animation,
        })
      }
    />
  );
};
