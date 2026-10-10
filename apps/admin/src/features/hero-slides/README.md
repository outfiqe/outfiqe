# hero-slides

## Purpose

Lets the team manage the rotating banner slides at the top of the web app's landing page.

## Structure

- `api/heroSlidesApi.ts` — list slides (`GET /hero-slides/admin`), create one, publish or hide it, and update its image (`PATCH /hero-slides/:id`).
- `api/heroSlidesSchemas.ts` — Zod schemas for a slide.
- `components/HeroSlidesPage.tsx` — the slide list and the create form.
- `schemas/heroSlideForm.schema.ts` — validation for the slide form: tag, title, description and the call-to-action label and link (unit-tested beside it).

## Funnel

**User-facing:** an admin adds a slide with its text, button and image, then publishes it. It appears in the landing page banner.

**Technical:** `routes/_authenticated.hero-slides.tsx` → `components/HeroSlidesPage.tsx` → `api/heroSlidesApi.ts` → `apiClient` → `/api/hero-slides` in `apps/api/src/modules/hero-slides`.
