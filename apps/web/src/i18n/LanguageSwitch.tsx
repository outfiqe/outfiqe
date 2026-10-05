"use client";

import { cn } from "@outfiqe/design-system";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, useTransition } from "react";

import { announceLocaleChange, readLocaleCookie, subscribeToLocaleChanges } from "./localeCookie";
import { type SupportedLocale } from "./locales";
import { setLanguage } from "./setLanguage";

const LANGUAGE_OPTIONS: { locale: SupportedLocale; label: string; name: string }[] = [
  { locale: "en", label: "EN", name: "English" },
  { locale: "ne", label: "नेपाली", name: "नेपाली (Nepali)" },
];

const readLocaleOnServer = (): SupportedLocale | null => null;

export const useChosenLanguage = () => {
  const router = useRouter();
  const chosenLocale = useSyncExternalStore(
    subscribeToLocaleChanges,
    readLocaleCookie,
    readLocaleOnServer,
  );
  const [isSwitching, startTransition] = useTransition();

  const chooseLanguage = (locale: SupportedLocale) =>
    startTransition(async () => {
      await setLanguage(locale);
      announceLocaleChange();
      router.refresh();
    });

  return { chosenLocale, chooseLanguage, isSwitching };
};

export const LanguageSwitch = ({ className }: { className?: string }) => {
  const { chosenLocale, chooseLanguage, isSwitching } = useChosenLanguage();

  return (
    <div
      role="group"
      aria-label="Language / भाषा"
      className={cn("inline-flex rounded-full border border-border p-0.5 text-xs", className)}
    >
      {LANGUAGE_OPTIONS.map(({ locale, label, name }) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-label={name}
          aria-pressed={chosenLocale === locale}
          disabled={isSwitching}
          onClick={() => chooseLanguage(locale)}
          className={cn(
            "cursor-pointer rounded-full px-2.5 py-1 font-medium transition-colors",
            chosenLocale === locale
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
