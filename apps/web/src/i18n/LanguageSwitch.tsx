"use client";

import { cn } from "@outfiqe/design-system";

import { type SupportedLocale } from "./locales";
import { useChosenLanguage } from "./useChosenLanguage";

const LANGUAGE_OPTIONS: { locale: SupportedLocale; label: string; name: string }[] = [
  { locale: "en", label: "English", name: "English" },
  { locale: "ne", label: "नेपाली", name: "नेपाली (Nepali)" },
];

export const LanguageSwitch = ({ className }: { className?: string }) => {
  const { chosenLocale, chooseLanguage } = useChosenLanguage();

  return (
    <div
      role="group"
      aria-label="Language / भाषा"
      className={cn("inline-flex items-center gap-1 text-xs", className)}
    >
      {LANGUAGE_OPTIONS.map(({ locale, label, name }, index) => (
        <span key={locale} className="inline-flex items-center gap-1">
          {index > 0 && (
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
          )}
          <button
            type="button"
            lang={locale}
            aria-label={name}
            aria-pressed={chosenLocale === locale}
            onClick={() => chooseLanguage(locale)}
            className={cn(
              "cursor-pointer rounded-sm px-1 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              chosenLocale === locale
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        </span>
      ))}
    </div>
  );
};
