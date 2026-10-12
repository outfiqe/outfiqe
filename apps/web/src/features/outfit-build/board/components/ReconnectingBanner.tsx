"use client";

import { useTranslations } from "next-intl";

export const ReconnectingBanner = ({ isReconnecting }: { isReconnecting: boolean }) => {
  const t = useTranslations("outfitBuild.board");
  if (!isReconnecting) return null;

  return (
    <p
      role="status"
      className="rounded-lg bg-amber-100 px-3 py-2 text-center text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      {t("reconnecting")}
    </p>
  );
};
