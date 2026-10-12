# hero-slides

## Purpose

The rotating banner slides at the top of the web app's landing page, managed by the team in the admin app.

## Structure

- `hero-slide.routes.ts` — `/api/hero-slides`. Public: `GET /` (published slides, served from the Redis response cache). Admin (`platformGuards.catalogRead` / `catalogManage`): `GET /admin`, `POST /`, and `PATCH /:id`. Every write reloads the public cache straight away (`refreshCacheOnWrite`) and asks the web app to refresh its cached landing page (`revalidateWebCacheOnWrite`).
- `hero-slide.controller.ts` — reads validated input and sends the response.
- `hero-slide.service.ts` — `heroSlideService`: create, update, the admin list, and the public list.
- `hero-slide.repository.ts` — `heroSlideRepository`: Prisma queries, ordered by `sortOrder` then newest first.
- `hero-slide.utils.ts` — `toPublicHeroSlide`, which adds the responsive image to each public slide.
- `hero-slide.schemas.ts`, `hero-slide.types.ts` — request validation and shapes.
- `hero-slide.responsive-image.integration.test.ts` — the slide image's responsive variants.

## Funnel

**User-facing:** an admin adds a slide with an image, text and link, orders it, and publishes it. Visitors see the published slides rotate at the top of the landing page.

**Technical:** admin `hero-slides` feature → `hero-slide.routes.ts` → `hero-slide.controller.ts` → `heroSlideService` → `heroSlideRepository` → Postgres via Prisma. The web app reads `GET /api/hero-slides` on the server (`apps/web/src/features/landing/components/Hero/getHeroSlidesServer.ts`).

## Non-obvious rationale

- **Two caches are refreshed on every write.** The API's own Redis response cache is reloaded in place, and the web app's server-rendered landing page is told to revalidate. Without the second, a published slide would wait for the web cache to expire before anyone saw it.
