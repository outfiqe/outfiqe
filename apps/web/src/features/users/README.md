# users

## Purpose

Self-service account identity for every signed-in user, regardless of role or creator status: editing your own display name, username, and avatar, plus the shared handle-validation/availability primitives other features (`creator-dashboard`) build their own profile-edit UI on top of.

## Structure

- `api/profileApi.ts` — `profileApi.updateMe` (`PATCH /users/me`) and `profileApi.checkHandleAvailability` (`GET /users/handle-availability`). Moved here from `features/auth/api/profileApi.ts`, where it originally only ever sent `{ phone }` from the Security page's "add a phone number" nudge (`features/auth`'s `useAddPhoneNumber` still imports it from here) — it's now the general self-service profile-update client.
- `api/userProfileSchemas.ts` — `handleFieldSchema`/`HANDLE_MIN_LENGTH`/`HANDLE_MAX_LENGTH`/`HANDLE_PATTERN` (moved from `creator-dashboard/api/creatorDashboardSchemas.ts`, which now imports them from here instead of keeping its own copy), `updateOwnProfileInputSchema`/`UpdateOwnProfileInput`, `handleAvailabilitySchema`/`HandleAvailability`, and `ownProfileSchema`/`OwnProfile`.
- `hooks/useUpdateOwnProfile.ts` — thin `useMutation` wrapper around `profileApi.updateMe`.
- `hooks/useHandleAvailability.ts` — debounced live username-availability check (`idle | checking | available | taken | invalid`), moved from `creator-dashboard/hooks/useHandleAvailability.ts` once a second, non-creator profile-edit surface needed the exact same check. `creator-profile`'s `CreatorProfile` (the approved-creator edit modal) imports it from here now.
- `components/EditOwnProfileCard.tsx` — the lightweight "who you are" card + edit modal (photo, display name, username) rendered on `/profile` for any account that isn't an approved creator or a brand owner (`app/(dashboard)/profile/page.tsx`'s `CreatorProfileSection`). Deliberately excludes the creator-only fields (`heightCm`, `showHeight`, `hideFromLeaderboards`) that `creator-profile`'s own edit modal carries — those have no meaning for an account with no public creator profile yet.
- `api/usersApi.ts`, `hooks/useUsers.ts`, `components/UserList.tsx` — a minimal `GET /users`/`GET /users/:id` client and list view, pre-existing and unrelated to the self-service pieces above.

## Funnel

**User-facing:** any signed-in user opens `/profile`. An approved creator or brand owner sees their full public-facing profile/dashboard (`creator-profile`/`brand-dashboard`, unchanged). Everyone else sees `EditOwnProfileCard` — their name, `@handle`, and avatar, with an "Edit profile" button — followed by the existing "become a creator" pitch (`creator-dashboard`'s `CreatorStatusGate`). Editing name/avatar is unrestricted; changing the username is subject to the same 14-day cooldown and 10/day rate limit an approved creator's own edit already had, since both write the same `User.handle` column.

**Technical:** `EditOwnProfileCard` renders with the `name`/`handle`/`avatarUrl` already fetched server-side by `creator-dashboard`'s `getCreatorProfileServer` (`GET /creators/me`, which returns a profile for any authenticated user regardless of creator status) — no second request. On save it calls `useUpdateOwnProfile` → `profileApi.updateMe` → `PATCH /users/me`, then syncs the result into `useAuth`'s session via `updateUser`. Username availability is checked live via `useHandleAvailability` → `profileApi.checkHandleAvailability` → `GET /users/handle-availability`, the same endpoint `creator-profile`'s edit modal already used. The backend's `userService.prepareHandleChange`/`writeProfile` (`apps/api/src/modules/users/user.service.ts`) hold the cooldown/availability/race-handling logic that both `PATCH /users/me` and `PATCH /creators/me` now share — see that module's README.
