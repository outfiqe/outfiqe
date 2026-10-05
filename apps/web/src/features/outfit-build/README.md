# outfit-build

## Purpose

The web side of Outfit Build: My Builds, the live build board, the build card inside chats, and
the view of a locked build for the people it was shared with. Everything here is in English and
Nepali (see `../../i18n`), prices are shown in lakh format (Rs 2,40,000) and times in Nepal time.
The whole feature sits behind the `outfit_builder` flag on the API.

## Structure

- `api/outfitApi.ts`, `api/outfitSchemas.ts` — the `/api/outfits` client and zod schemas for every
  response. Every write sends the build version it last saw (`X-Outfit-Version`) and a fresh
  `Idempotency-Key`.
- `hooks/`
  - `useOutfit` — the build (`["outfit", id]`), either the live board or the published version.
  - `useOutfitWrites` — `runWrite(send, applyChange)`: writes go out one at a time, each applies
    its change to the cached board straight away and rolls it back if the server refuses. A
    version conflict refetches the board and says who changed it ("Board updated by Sita,
    showing latest"); other refusals are explained by error code in the viewer's language.
  - `useOutfitLiveSync` — joins the build's socket room, asks to catch up after every
    (re)connect, refetches when `outfit:updated` announces a newer version, and reports
    "Reconnecting…" and removal from the build.
  - `useMyBuilds` / `useBuildsSharedWithMe`, `useSlotProductSearch` (product search filtered to a
    slot's garment types and to items in stock).
- `components/`
  - `MyBuildsPage` — My builds / Shared with me tabs, New build, empty/loading/error states, and a
    "coming soon" state while the flag is off.
  - `BuildPage` — loads a build and shows `BuildBoard` or `PublishedBuildView`.
  - `BuildBoard` — the header (title, status, visibility, open chat), `BoardActions` as a toolbar,
    `BudgetBar`, then tabs: **Outfit** (the `SlotCard` grid with `ProductFinderPanel` beside it on
    wide screens), **People** (`BoardPeople`), **Photos** (`BoardPhotosPanel`, only while photos are
    switched on) and **Buy & drop** (`BuyBuildPanel`, `PostAsLookPanel`, offers). Also the picker
    and modals. Wraps everything in a dnd-kit `DndContext`.
  - `SlotCard` — one slot: its items (image, price, stock in words, who added it) and empty
    places to tap. It is also the drop target when dragging.
  - `ProductPickerModal` — tap a slot → search products of that slot's garment types → tap one.
  - `ProductFinderPanel` — draggable search results beside the slots on extra-wide screens
    (`xl`); on smaller screens people add items by tapping a slot instead.
  - `InviteEditorsModal`, `VisibilityModal`, `BoardSettingsModal` — owner tools; people are picked
    with the messaging `ContactPicker`.
  - `BuildCardMessage` — the card a chat shows for a build started in it; it loads the build live.
  - `BoardPhotosPanel` and `AddBuildPhotosModal` — build photos on the board (see "Photos" below).
  - `BuildCoverGrid` — the picture area of a build card: the cover photos, or the first three
    items with "+N items". Used by `BuildSummaryCard` and `PublicBuildCardView`.
  - `PublicBuildPhotos` — the photo and try-on galleries on a shared or public build, with a
    report button on each photo.
  - `AvailabilityLabel`, `BudgetBar`, `PersonAvatar`, `ReconnectingBanner`, `BuildSummaryCard`.
- `utils/` — `outfitBoardRules.ts` (the shared slot rules from `@outfiqe/utils`, run before a
  request is sent, and the instant local board changes), `outfitFormatting.ts` (lakh format,
  Nepal time), `toOutfitProduct.ts`.

Routes: `app/(dashboard)/builds/page.tsx` (My Builds, signed in only) and
`app/builds/[outfitId]/page.tsx` (a build), each with a `loading.tsx` skeleton. Every tab group in
this feature keeps its tab in the URL as `?tab=` through `@/shared/hooks/useTabSearchParam`: My
Builds (`mine`, `shared`), the board (`outfit`, `people`, `photos`, `buy-and-drop`) and the profile
Builds tab (`drops` or `products`, and `builds`), so a link or a refresh opens the same tab. The build page shows a signed-in person their board, or the locked version with likes,
saves and comments (`SocialBuildView`). A signed-out visitor sees a public build server-rendered
(`PublicBuildPage`, loaded by `api/getPublicBuildServer.ts`) with its own title, description and
image for search engines and shared links. Anything else sends them to sign in. Only public builds
are indexed.

Builds in public (`api/outfitSocialApi.ts`, `api/outfitSocialSchemas.ts`, `hooks/useBuildSocial.ts`):

- `PublicBuildsFeed` — filters (`PublicBuildFiltersBar`: a row of style chips that scrolls sideways
  on phones, price range chips, an "everything in stock" chip, a clear button and a sort menu for
  newest, most cheriqed, or price either way), a grid of `PublicBuildCardView`s, infinite scroll,
  loading and error states, an empty state that says when the filters are the reason and offers to
  clear them (the sort order is kept), and the `BuildDetailModal` pop-up. The price ranges and the
  clear rules live in `utils/publicBuildFilters.ts`; each range stops one rupee below the next so a
  build never falls in two. Shown on Explore's Builds tab and, through `ProfileBuildsTabs`, as a
  Builds tab on creator profiles (builds they contributed to) and brand profiles (builds using
  their products). Both only while `outfit_public_feed` is on for the viewer.
- `PublicBuildDetailView` — the locked items with live stock, contributors linking to their
  profiles, `BuildReactionsBar` (like and save, updated at once in every cached copy and rolled
  back on failure), report, and `BuildComments` (one level of replies, delete your own, report
  others'). Used by the pop-up, the public page and `SocialBuildView`.

Ways in from the rest of the app:

- The dashboard nav (`components/useDashboardNav.ts`) shows My Builds right after Overview, only
  when `useFeatureFlag("outfit_builder")` (`shared/hooks/useFeatureFlag.ts`, backed by
  `GET /api/feature-flags/mine`) says the feature is on for this person.
- Chats render messages of kind `OUTFIT_CARD` with `BuildCardMessage` (`messaging/MessageThread`).
  It imports the component file directly, not this feature's `index.ts`, because this feature
  already imports `ContactPicker` from messaging.
- The board's `lastLockedVersion` tells `VisibilityModal` whether the build has ever been locked,
  so a board reopened after a lock can still be shared as the version that was locked.
- Sold-out items: the board shows a banner counting them, and each one gets a visible "Swap"
  button. Swapping opens `ProductPickerModal` with "Similar and in stock" suggestions from
  `useReplacementSuggestions` (`GET /api/outfits/:id/slots/:slotKey/positions/:position/replacements`)
  above the normal search. `useOutfitLiveSync` refetches the board on
  `outfit:availability-changed`, so an item selling out shows up without a reload.
- Posting as a look: on a locked build, `PostAsLookPanel` (in the board's side column) shows
  creators who are on the build a "Drop as a look" button. `PublishLookModal` reuses the creator
  photo cropper and upload (`../creator-dashboard/components/PostModal.constants`,
  `PhotoCropPane`, `usePendingPhotos`), prefills the caption with the build's name and each
  item's size from `useMySizeByProductType`, and sends `POST /api/outfits/:id/look`
  (`hooks/useBuildLook.ts`). Afterwards the panel links to the look; when a newer version has
  been locked since, it offers "Drop the new version".
- Sizes: `SlotCard` labels each item with the person's size from `../saved-sizes`
  (`useMySizeByProductType`), using `describeSizeFit` in `utils/outfitBoardRules.ts`.
- Buying: `BuyBuildPanel` appears on a locked board (items from `toBuyableBuildItems`, sizes
  prefilled from the person's saved sizes) and under a shared or public build
  (`PublicBuildDetailView`, sizes from `GET /api/outfits/:id/public`). Each item has a tick and a
  size picker; sold-out sizes can't be picked. "Buy the full set" sends every item with a size,
  "Add the ticked items" sends only the ticked ones (`hooks/useBuyFromBuild.ts` →
  `POST /api/outfits/:id/cart`, then the bag query is refreshed). The panel then says how many
  items were added, links to the bag, and lists anything left out with the reason. Signed-out
  visitors get a sign-in link; brand and staff accounts don't see the panel.
- Photos (while `outfit_photos` is on): `BoardPhotosPanel` in the board's side column shows the
  build's photos, lets members add more through `AddBuildPhotosModal` (the same cropper and
  `resolvePendingPhotoAssets` upload as posting a look, then `outfitApi.addPhotos`), lets the
  uploader or the owner remove one, and lets the owner star photos as covers in order. While
  `outfit_try_on` is on, try-on photos have their own gallery and button. The board's `limits`
  say how many photos are left. `PublishLookModal` starts with the build's cover photos, which
  the creator can keep or remove.
- Saving a board change: `useOutfitWrites().runWrite` resolves to whether the server took the
  change, so `AddBuildPhotosModal`, `InviteEditorsModal`, `VisibilityModal` and
  `BoardSettingsModal` stay open, with what was entered, when it is refused.

## Funnel

**User-facing**: from My Builds, tap New build. Tap an empty slot to pick a product (or drag one
from the side panel on a computer), invite people, and everyone taps "I'm happy". The owner locks
the build and chooses who can see it. Changes by others appear live; if two people change the
board at once, the loser's change is undone and they're told who got there first.

**Technical**: component → `useOutfitWrites` / `useOutfit` → `outfitApi` → `/api/outfits` →
`apps/api/src/modules/outfits`. Live: socket `outfit:updated` / `outfit:sync-result` →
`useOutfitLiveSync` → react-query invalidation → `outfitApi.get`.

## Non-obvious rationale

- **My Builds lives in the `(dashboard)` group, a single build doesn't.** `/builds` is signed-in
  only, so it sits in `app/(dashboard)/builds` with Offers and the rest of the sidebar. Moving
  between them keeps the frame mounted and shows the page's `loading.tsx` skeleton at once, instead
  of leaving the previous page on screen while a different layout loads. `/builds/<id>` can't move
  there: it is also the public, indexable page for a shared build, and the dashboard layout marks
  every page `noindex` and expects a session. So `app/builds/layout.tsx` checks the session itself
  and renders `DashboardShell` when signed in, or the standalone public page when not.
- **Lists and pages decide "loading" with react-query's `isPending`, not `isLoading`.** These
  components are server-rendered first, and on the server a query never fetches, so `isLoading`
  is false there. Using it put the empty state ("No builds yet") into the server HTML, which
  flashed on every refresh before the real data arrived. `isPending` is true until there is data,
  so the server and the first client paint show the skeleton instead. A query that is switched off
  on purpose (`PostAsLookPanel` when you can't post) returns before the skeleton is drawn, so it
  never shows one forever.
- **Tab switches write the URL with `history.replaceState`, not `router.replace`.** On the build
  page `router.replace` would re-run the server page (its session check and metadata fetch) on
  every tab click. `replaceState` keeps `useSearchParams` in sync without that, the same reason the
  creator profile uses it for `?look=`. The hook also highlights the new tab at once through
  `usePendingSelection`, like Explore's tabs.
- **The board is split into tabs so it fits on one screen.** Everything used to sit in one long
  right-hand column (finder, people, actions, photos, drop as look, buy, offers), so editing meant
  a lot of scrolling. The actions are now a toolbar above the tabs, so lock, unlock, "I'm happy",
  who can see it and settings are always in reach.
- **Writes are queued, not fired in parallel.** Each write carries the version it expects. Two
  writes sent at once from the same screen would make the second one conflict with the first, so
  the hook sends them one after another, each with the version the previous one returned.
- **Live events only say "version N now".** The board refetches instead of patching itself from
  the event, so a missed event can never leave a stale board on screen.
- **Rules are checked twice.** The same slot rules the API enforces run in the browser first, so
  "shoes don't go in Top" is explained instantly without a round trip; the server still decides.
- **Tap first, drag second.** Every action works by tapping (and so by keyboard); dragging from
  the desktop side panel is an extra, using dnd-kit's pointer and keyboard sensors.
