# brand-application

## Purpose

The "List your brand" form on `/apply`: a brand that wants to sell on Outfiqe sends its details, and the team reviews it and sends an invite link to set up a brand account.

## Structure

- `components/BrandApplicationForm.tsx` — the form: brand name, contact name, email, phone, Instagram/TikTok handle and whether the brand makes its own pieces. Shows `BrandApplicationSuccess` once the application is sent.
- `components/ProductionField.tsx` — the "Do you design or make your own pieces?" question, drawn as a `ChipGroup`.
- `components/ChipGroup.tsx` — a row of single-choice chips (`role="radio"`).
- `components/BrandApplicationSuccess.tsx` — the "Application sent" message; its heading takes focus when it appears so screen readers announce it.
- `schemas/brandApplication.schema.ts` — the form's Zod schema (`BrandApplicationInput`); the email is lower-cased and the phone must be a Nepali number starting with 98.
- `constants/brandApplicationForm.constants.ts` — the production choices (`MAKES`, `RESELLS`, `BOTH`).
- `api/brandApplicationApi.ts` — `submit`, a `POST /brand-applications`.
- `hooks/useSubmitBrandApplication.ts` — the submit mutation.
- `utils/errors.ts` — `getBrandApplicationErrorMessage`, which turns the API's error code into a short message (rate limited, invalid form, or a generic retry message).
- `index.ts` — what `app/apply/page.tsx` imports.

## Funnel

**User-facing:** a brand opens `/apply`, reads the perks, fills in the form and presses send → they see "Application sent" with a note that the team will reply within a week. If they open an expired invite link, they land on `/apply?expired=1` and a banner asks them to apply again (`app/apply/ApplyExpiredBanner.tsx`).

**Technical:** `BrandApplicationForm` (react-hook-form + `brandApplicationSchema`) → `useSubmitBrandApplication` → `brandApplicationApi.submit` → `POST /api/brand-applications` (`apps/api/src/modules/brand-applications`). A failed request's error code goes through `getBrandApplicationErrorMessage` into a `FormBanner`.
