"use client";

import { useTranslations } from "next-intl";

type TranslatedPageHeadingProps = {
  namespace: string;
  titleKey: string;
  descriptionKey: string;
};

export const TranslatedPageHeading = ({
  namespace,
  titleKey,
  descriptionKey,
}: TranslatedPageHeadingProps) => {
  const t = useTranslations(namespace);

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-foreground">{t(titleKey)}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t(descriptionKey)}</p>
    </>
  );
};
