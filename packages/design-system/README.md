# design-system

## Purpose

The shared UI primitive library both `apps/web` and `apps/admin` build on — Radix-based components with `class-variance-authority` variants, the light/dark theme tokens both apps' Tailwind config reads, and the theme-switching runtime.

## Structure

- `tokens.css` — the semantic HSL custom properties (`--background`, `--foreground`, `--primary`, etc.) both apps import into their `@theme inline` Tailwind config. Values under `:root` are light mode; the same properties are overridden under `.dark` for dark mode. `fonts.css` is imported from here too.
- `theme.ts` — `useTheme()` (a `useSyncExternalStore` subscription over `document.documentElement`'s `dark` class + `localStorage`), and `THEME_INIT_SCRIPT`, an inline boot script string consuming apps embed before hydration to avoid a flash of the wrong theme.
- `theme-toggle.tsx` — `ThemeToggle`, the Sun/Moon icon button wired into both apps' navbars.
- `button.tsx`, `input.tsx`, `select.tsx`, `checkbox.tsx`, `label.tsx`, `badge.tsx`, `modal.tsx`, `carousel.tsx`, `skeleton.tsx`, `toast.tsx`, `multi-select.tsx`, `autocomplete.tsx`, `form.tsx`, `form-banner.tsx` — the UI primitives. `form.tsx` wraps `react-hook-form` (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`); `form-banner.tsx` is the standalone alert/callout banner, not tied to a form field. `select.tsx`/`checkbox.tsx` are plain native `<select>`/`<input type="checkbox">` elements styled to match `input.tsx` exactly (same height/border/focus classes) rather than Radix primitives — matching `multi-select.tsx`'s own internal option-picker, which already uses a styled native `<select>` for the same reason: a native control gets full keyboard/screen-reader semantics for free, and neither needs Radix's portal/positioning machinery a combobox or multi-panel widget would.
- `avatar-uploader.tsx`, `banner-uploader.tsx`, `image-uploader.tsx`, `image-crop-modal.tsx`, `crop-surface.tsx`, `crop-image.ts`, `use-image-crop-upload.ts`, `hidden-file-input.tsx` — the image-upload-with-crop pipeline: pick a file, crop it in a modal, hand the cropped blob to the caller's own upload function.
- `cn.ts` — the `clsx` + `tailwind-merge` class-name helper every component uses.
- `index.ts` — re-exports everything above; both apps only ever import from `@outfiqe/design-system`, never a component's own file path.

## Funnel

**User-facing:** a component from this package renders identically (same markup, same variant classes) in both apps; only the CSS custom property _values_ it reads differ per app-level `@theme inline` wiring and per `:root`/`.dark` selector. Toggling `ThemeToggle` flips the `dark` class on `<html>`, which repaints every consumer instantly since they all read the same custom properties — no per-component dark-mode styling needed.

**Technical:** each app's global CSS does `@import "@outfiqe/design-system/tokens.css";` then remaps those custom properties into Tailwind's `--color-*` namespace via `@theme inline`. `ThemeToggle` calls `useTheme()`, which resolves the current theme by reading `document.documentElement`'s class list (already set synchronously by `THEME_INIT_SCRIPT`, embedded in `apps/web/src/app/layout.tsx`'s `<head>` and hand-duplicated as plain JS in `apps/admin/index.html`, since a static HTML file can't import a package). Toggling calls `document.documentElement.classList.toggle("dark", …)` and persists the choice to `localStorage["outfiqe-theme"]`; `useSyncExternalStore`'s subscription re-renders every mounted `useTheme()` consumer in sync.

## Non-obvious rationale

- **No React Context provider for theme.** The rest of this package's stateful, cross-component concerns (see `toast.tsx`) already use a module-level store with a `Set` of listeners rather than Context, so `theme.ts` follows the same shape instead of introducing a second pattern for the same problem.
- **`useSyncExternalStore`, not `useState` + `useEffect`.** An effect that calls `setState` synchronously on mount (to correct the theme after hydration) triggers `react-hooks/set-state-in-effect` and causes a real cascading-render smell. `useSyncExternalStore`'s `getServerSnapshot` (`getServerTheme`, hardcoded `"light"`) gives Next.js SSR a stable first paint that matches the client's first hydration pass, then the store's real client snapshot (read from the DOM/`localStorage`) takes over — the sanctioned way to sync React state with an external mutable source without a manual effect.
- **`THEME_INIT_SCRIPT` is duplicated as plain JS in `apps/admin/index.html`.** A static Vite `index.html` is parsed before any bundle loads, so it can't `import` this package — the boot logic (read `localStorage`, fall back to `matchMedia`, toggle the class) is necessarily hand-copied there. Keep both copies reading the same `"outfiqe-theme"` key and toggling the same `"dark"` class if either changes.
- **`<html suppressHydrationWarning>` in `apps/web/src/app/layout.tsx`.** `THEME_INIT_SCRIPT` mutates `<html>`'s class list before React hydrates, which would otherwise log a hydration-mismatch warning for an attribute React never controls in the first place.
