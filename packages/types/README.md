# @outfiqe/types

## Purpose

Framework-free TypeScript type declarations shared between `apps/api`, `apps/web`, and
`apps/admin` — request/response DTO shapes and domain unions that more than one app needs to agree
on. No runtime code, no dependencies beyond `@outfiqe/utils` for the enum values a few of these
types are derived from.

## Structure

One folder per domain, each re-exported from `src/index.ts`: `admin`, `api`, `badges`, `bank`,
`brand`, `brand-payout`, `category`, `chat`, `collection`, `commission`, `hero-slide`, `image`,
`leaderboard`, `notification`, `order`, `product`, `user`, `withdraw`, `xp`.

- `image/` — `ResponsiveImage` (`{ url, lqip, sources }`): the shape a public API response uses to
  carry an original image URL plus optional per-format (`avif`/`webp`/`jpeg`) `srcSet` strings and
  a base64 blur placeholder, so a client can render a `<picture>` with an instant preview. `url` is
  always the original upload URL; `sources` is empty when the image has no processed pipeline
  output yet. Built on the API side by `apps/api/src/shared/utils/responsive-image.utils.ts`.
