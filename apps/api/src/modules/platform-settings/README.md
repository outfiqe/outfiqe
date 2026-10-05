# platform-settings

## Purpose

Platform-wide numbers that admins can change without a new release, such as how many items an
Outfit Build can hold. Every setting has a default in code. A saved value only overrides that
default.

## Structure

- `platform-settings.registry.ts` — `PLATFORM_SETTING_REGISTRY` (each setting's label,
  description, group, default and allowed range), `readSettingValue`, and
  `PLATFORM_SETTING_RULES`, the rules that link two settings (for example, items needed to lock
  can't be more than items allowed on a board).
- `platform-settings.utils.ts` — turning stored rows into values, the per-setting Zod schema, the
  "must be a whole number from X to Y" message, and the rule check.
- `platform-settings.repository.ts` — reads and writes `app_settings`.
- `platform-settings.service.ts` — `get(key)` and `getAll()` for the rest of the app (cached for a
  minute), `list()` for the admin screen, `update(key, value, adminId)` and `reset(key, adminId)`.
- `platform-settings.schemas.ts`, `.controller.ts`, `.routes.ts` — the admin API.
- `platform-settings.types.ts`, `.constants.ts` — shapes and the cache lifetime.

## HTTP surface

All require `platform:settings:manage`, which only super admins have unless a role grants it.

- `GET /api/platform/settings` — every setting with its current value, default, range, whether
  it is overridden, and when it last changed.
- `PUT /api/platform/settings/:key` with `{ value }` — save a value. `422` if it is out of range
  or would break a rule between settings.
- `DELETE /api/platform/settings/:key` — go back to the default.

Every write is recorded in the platform audit log with the old and new value.

## Funnel

**User-facing:** a super admin opens Settings in the admin panel, changes a limit, and within a
minute the rest of the app follows it. The admin screen itself is built later, with the rest of the
Outfit Build admin.

**Technical:** `platform-settings.routes` → `requirePlatformRole("platform:settings:manage")` →
controller → `platformSettingsService.update` → one serializable transaction in the repository →
`app_settings` → audit log. Readers call `platformSettingsService.get(key)`.

## Non-obvious rationale

**A missing or broken row means "use the default", never "fail".** An empty production database
works on day one. A stored value that no longer fits its range (because a range was tightened in
code, say) is ignored with a warning and the default is used. If the settings table can't be
read at all, every setting falls back to its default instead of breaking the request. This is the
"config is an override, not a prerequisite" lesson from the withdraw-policy bootstrap problem.

**Each change runs in one serializable transaction.** The rules compare two settings. Two admins
changing both sides at the same moment could each pass the check on their own and together break
it. Serializable isolation makes one of them retry (`runWithDeadlockRetry`) and see the other's
change.

**Cached for 60 seconds in each process.** A write clears the cache in the process that made it.
Other processes pick it up within a minute. These are limits, not kill switches; for something
that must stop at once, use a feature flag (`../feature-flags`), which caches for 5 seconds.

**Only whole-number settings exist so far**, because that is all the Outfit Build limits need.
Another kind of value needs its own schema in the registry.
