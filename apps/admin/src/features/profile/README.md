# profile (admin)

## Purpose

The signed-in staff member's own account settings: editing their display name and avatar, and
changing their password. Any account that can reach the admin app (platform admin, co-founder, or a
business owner who now owns a CRM organization) uses this page.

## Structure

- `ProfilePage.tsx` — the `/profile` route component. Name + avatar form (`authApi.updateProfile`
  → `PATCH /users/me`, then `updateUser` on `AuthContext` so the sidebar/header reflect the change
  immediately), followed by the password card.
- `ChangePasswordCard.tsx` — current + new + confirm password form (`authApi.changePassword` →
  `POST /auth/change-password`). Checks length and confirmation match client-side (same inline
  pattern as `RegisterInvitePage`/`CrmInviteRegisterPage`), then surfaces the API's own error
  message (wrong current password, breached password, etc.) in a `FormBanner`.

## Funnel

**User-facing:** open `/profile` from the account menu → edit name/avatar and Save, or fill in the
current password plus a new one and Update. A successful password change signs the account out of
every other device; the current session stays active.

**Technical:** `ProfilePage` / `ChangePasswordCard` → `authApi` (`@/features/auth/api`) → API
client → `apps/api`'s `auth`/`users` modules. Server-side, `POST /auth/change-password` verifies
the current password, runs the breach check, re-hashes, and revokes the other refresh-token
families — see `apps/api/src/modules/auth/README.md`.

## Non-obvious rationale

- Password concerns live in the shared `auth` API module, not `users`, so the admin app calls
  `POST /auth/change-password` directly rather than routing password changes through
  `PATCH /users/me` (which only handles name/avatar).
- The card uses raw `Input type="password"` fields, matching the existing admin auth forms
  (`RegisterInvitePage`, `CrmInviteRegisterPage`) — the admin app has no shared password-input
  primitive with a show/hide toggle, unlike `apps/web`.
