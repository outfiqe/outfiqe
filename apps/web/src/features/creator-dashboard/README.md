# creator-dashboard

## Purpose

Everything a creator manages about their own account from `/dashboard/*`: profile edits, applying to become a creator, posting/editing looks, share links, and earnings. Post viewing/browsing lives in `creator-profile`, not here — this feature owns the mutation side of a creator's posts.

## Structure

- `components/PostModal.tsx` — create-a-post modal: multi-photo crop/upload, caption, product tagging.
- `components/EditPostModal.tsx` — edit-a-post modal wrapper: fetches the look, shows a layout-matched skeleton while loading, then mounts `EditPostForm` once data is ready.
- `components/EditPostForm.tsx` — the actual edit form (photos, caption, tags). Mounted fresh (`key={lookId}`) per post being edited so its local photo/form state always seeds correctly from real data — no effect-driven resync needed.
- `components/ProductTagPicker.tsx` — shared tag-picker UI used by both `PostModal` and `EditPostForm`.
- `components/ApplyAsCreatorButton.tsx`, `EarningsSection.tsx`, `ShareSection.tsx` — the other dashboard sections.
- `components/CreatorStatusGate.tsx` — the shared "not an approved creator yet" state (application under review / become-a-creator pitch + `ApplyAsCreatorButton`), rendered by `EarningsSection`, `ShareSection`, and `app/dashboard/profile/page.tsx` whenever `creatorStatus !== APPROVED`.
- `api/creatorLooksApi.ts`, `creatorLooksSchemas.ts` — look create/edit/delete requests + response validation.
- `api/creatorDashboardApi.ts`, `creatorDashboardSchemas.ts` — profile read/update.
- `hooks/useCreateLook.ts`, `useUpdateLook.ts`, `useDeleteLook.ts`, `useLookDetail.ts` — look mutations and the on-demand single-look fetch used to prefill the edit modal.
- `hooks/useUpdateCreatorProfile.ts`, `useTaggableProducts.ts` — profile update and product search for tagging. `PostModal`'s local photo/crop state (`usePendingPhotos`) lives in `@/shared/hooks` — see below (`EditPostForm` manages its own photo state separately, unaffected).
- `schemas/lookForm.schema.ts` — `lookFormSchema` (the wire shape: `imageUrls`/`caption`/`taggedProducts`, used by both create and update requests) and `editLookFormSchema` (the `EditPostForm` RHF form itself, which only tracks caption/tags — photos are separate component state, merged in at submit time).

## Funnel

**User-facing:** a creator opens their own profile (`creator-profile`), taps the floating add-post button to post a new look, or opens the 3-dot menu on one of their existing posts to edit its photos/caption/tags or delete it.

**Technical:** `creator-profile`'s `CreatorProfile`/`CreatorPostThumbnail` render `PostModal`/`EditPostModal` from this feature (cross-feature import, same pattern as `CreatorProfile` already using `useUpdateCreatorProfile` and `explore`'s `AddPostButton`/`PostDetailModal`). `EditPostModal` fetches the look via `useLookDetail` → `creatorLooksApi.getOwn` → `GET /creator-looks/:lookId` to get per-tag `sizeWorn`, which the public feed-shaped post data doesn't carry. `EditPostForm` tracks existing image URLs and newly-added local photos separately; on submit it crops+uploads only the new photos, then sends the full `imageUrls` list (surviving existing + newly uploaded, in that order) to `PATCH /creator-looks/:lookId` — that endpoint replaces the look's whole image set. On success, mutations invalidate `["creator-looks"]`, `["explore-feed"]`, and `["saved-posts"]` so the profile grid, explore feed, and saved view all pick up the change.

## Non-obvious rationale

- **`/creators/me` never gates on creator status** — it returns a profile (including `handle` and `creatorStatus`) for any authenticated user, since it also backs the "become a creator" pitch screens. `/creators/by-handle/:handle` (the public profile, fetched server-side and rendered inline once the creator is approved) _does_ gate on `isCreator`/`APPROVED`. `app/dashboard/profile/page.tsx` has to check `creatorStatus === APPROVED` itself before fetching/rendering the public profile — doing so unconditionally would 404 non-approved users against the gated endpoint. There's no `[handle]` route under `/dashboard/profile` — the URL stays `/dashboard/profile` for every state (gate screen or the rendered profile); the page just fetches `getCreatorProfileServerPublic(profile.handle)` and renders `CreatorProfile` directly instead of redirecting to a per-handle URL.
- There used to be a standalone "Posts" dashboard section (`/dashboard/posts`, its own sidebar nav item) that just listed a creator's own looks with no edit/delete. It was removed because the creator's profile already shows the same grid — keeping both was duplicated UI with no distinct purpose. Posting now happens from the profile's floating action button; editing/deleting happens from the 3-dot menu on each post thumbnail (`creator-profile/components/PostActionsMenu.tsx`).
- **`PostModal`'s two-pane crop layout is a shared component, not local markup.** `usePendingPhotos`/`resolvePendingPhotoUrls` (`@/shared/hooks/usePendingPhotos.ts`), `PendingPhotoThumbnailRail` and `PhotoCropPane` (`@/shared/components/`), and the outer `MediaFormShell` (fixed photo pane + scrollable fields + sticky footer) were pulled out of this feature once `brand-dashboard`'s product modals needed the same "pick photos, crop one at a time, defer upload to submit" experience — see that feature's README for how it reuses them for products (a domain with a square aspect and optional, already-hosted existing photos instead of a mandatory portrait one).
- **Existing photos aren't re-cropped in edit mode**, only added or removed. They were already cropped/stored at post time; `EditPostForm` shows them as plain removable thumbnails and only runs a new photo through `CropSurface` once, at add-time, before it's committed to the list — reusing `PostModal`'s crop pipeline (`CROP_BOX_STYLE`, `PHOTO_ASPECT`, `getCroppedImageFile`) without needing `usePendingPhotos`, since edit only ever stages one new photo at a time rather than managing a whole multi-photo crop session.
- **`EditPostModal`/`EditPostForm` are split on purpose.** `useForm`'s `values` option can't be relied on alone to seed local (non-form) photo state from an async query without a real render-timing race (React Query's `isLoading` can read `false` for one frame right as a disabled query becomes enabled, before the fetch starts) — the wrapper only mounts `EditPostForm` once `lookDetail.data` actually exists, so the form's `useState`/`defaultValues` are always seeded from real data on first render, no `useEffect` resync required.
