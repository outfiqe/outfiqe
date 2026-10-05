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
- `TranslationsProvider.tsx` — used by the dynamic routes that render translated pages
  (`/builds`, `/settings/language`, `/settings/sizes`). It reads the language on the server, so the
  first render is already in the right language, then hands over to `ClientTranslationsProvider`
  with that language as its starting point and a `lang` wrapper.
- `ClientTranslationsProvider.tsx` — the provider that actually switches. At the root
  (`app/providers.tsx`) it covers translated pieces that can show up anywhere, such as the build
  card in the floating chat.
- `localeCookie.ts` — reads and writes the language cookie in the browser and tells listeners
  when it changes.
- `useChosenLanguage.ts` — `useChosenLanguage` (the chosen language and `chooseLanguage`) and
  `useActiveLocale` (the language a provider should show).
- `LanguageSwitch.tsx` — the small "English · नेपाली" switch in the site footer and at the
  bottom of the `/builds` pages.
- `LanguageSettings.tsx` — the same choice as a radio group, on `/settings/language`.
- `TranslatedPageHeading.tsx` — a translated page title and description, rendered in the browser
  so it switches with the rest of the page.

## Funnel

**User-facing:** tap नेपाली in the footer (or pick it under Settings → Language). Translated
screens switch at once and stay in Nepali on the next visit.

**Technical:** `LanguageSwitch` / `LanguageSettings` → `writeLocaleCookie` sets `NEXT_LOCALE` in
the browser and calls `announceLocaleChange()` → every `ClientTranslationsProvider` re-renders with
the new messages. On the next navigation `request.ts` reads the same cookie on the server.

## Non-obvious rationale

- **No language in the URL.** Adding `/ne/...` routes would change every existing URL, canonical
  link and sitemap entry. The storefront's public, indexed pages are still English only, so the
  choice lives in a cookie instead.
- **Two providers.** The server provider only works inside dynamic routes, because it reads the
  cookie. Most pages are static, yet the floating chat can show a build card on any of them, so a
  client provider at the root carries both message files and reads the cookie in the browser.
- **The cookie is not `httpOnly`.** The browser has to read it to pick the language on static
  pages. It holds only `en` or `ne`, never anything private.
- **Switching never waits on the server.** It used to call a server action to set the cookie and
  then `router.refresh()`, and the buttons stayed disabled until both finished, which felt slow.
  The browser now writes the cookie and every provider switches at once. No translated text is
  rendered by a server component any more (page headings use `TranslatedPageHeading`), so nothing
  is left behind in the old language.
- **The switch is in the footer, not the header.** It is small and out of the way, but still
  there for visitors who aren't signed in, such as someone opening a shared public build. Signed-in
  people also have Settings → Language.
