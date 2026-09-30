# i18n

## Purpose

English and Nepali text for the web app, using next-intl. Outfit Build is the first feature
written this way; other screens are still English only and move over as they are touched. Dates
use Nepal time and prices use lakh format everywhere a translated screen shows them.

## Structure

- `locales.ts` — the supported languages (`en`, `ne`), the default, the cookie name
  (`NEXT_LOCALE`) and its lifetime, and `NEPAL_TIME_ZONE`.
- `messages/en.json`, `messages/ne.json` — the text, grouped by feature (`language`,
  `outfitBuild.*`). Both files must have the same keys.
- `request.ts` — next-intl's server config: reads the cookie and loads that language's text.
- `TranslationsProvider.tsx` — server provider, used by the dynamic routes that render translated
  pages (`/builds`, `/settings/language`).
- `ClientTranslationsProvider.tsx` — client provider at the root (`app/providers.tsx`), for
  translated pieces that can show up anywhere, such as the build card in the floating chat.
- `localeCookie.ts` — reads the language cookie in the browser and tells listeners when it
  changes.
- `setLanguage.ts` — server action that saves the choice in the cookie.
- `LanguageSwitch.tsx` — the EN / नेपाली switch in the site header and phone menu, plus the
  `useChosenLanguage` hook.
- `LanguageSettings.tsx` — the same choice as a radio group, on `/settings/language`.

## Funnel

**User-facing:** tap नेपाली in the header (or pick it under Settings → Language). Translated
screens switch straight away and stay in Nepali on the next visit.

**Technical:** `LanguageSwitch` → `setLanguage` server action sets `NEXT_LOCALE` →
`announceLocaleChange()` re-renders the client provider and switch → `router.refresh()` re-renders
server components, whose `request.ts` reads the new cookie.

## Non-obvious rationale

- **No language in the URL.** Adding `/ne/...` routes would change every existing URL, canonical
  link and sitemap entry. The storefront's public, indexed pages are still English only, so the
  choice lives in a cookie instead.
- **Two providers.** The server provider only works inside dynamic routes, because it reads the
  cookie. Most pages are static, yet the floating chat can show a build card on any of them, so a
  client provider at the root carries both message files and reads the cookie in the browser.
- **The cookie is not `httpOnly`.** The browser has to read it to pick the language on static
  pages. It holds only `en` or `ne`, never anything private.
