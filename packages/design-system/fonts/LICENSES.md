# Bundled fonts

| Family          | Role                                  | Files                                                                                     | Licence                                                                                                                                            |
| --------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hanken Grotesk  | body / UI (`--font-body`)             | `hanken-grotesk-latin.woff2`, `hanken-grotesk-latin-ext.woff2` (variable, weight 400–800) | [SIL Open Font License 1.1](https://openfontlicense.org/) — Hanken Design Co.                                                                      |
| Cabinet Grotesk | display / headings (`--font-display`) | `cabinet-grotesk-{400,500,700,800}.woff2` (static)                                        | [Fontshare / Indian Type Foundry Free Font Licence](https://www.fontshare.com/licenses/itf-ffl) — free for commercial use, web embedding permitted |

Both are self-hosted (declared in `../fonts.css`, imported by `../tokens.css`). No runtime
request to Google Fonts or Fontshare.

## Why these

The previous pairing (Space Grotesk + Inter) is the pairing generic UIs converge on, and Space
Grotesk's geometric coldness read as "tech startup", not fashion. Hanken Grotesk is a modern
neutral grotesque close to what Everlane / COS commission, tuned for legibility at small sizes
across a broad age range; Cabinet Grotesk is a confident display grotesque with a little edge for
the uppercase headings. Both ship the full weight range the design system uses, so `font-bold` /
`font-extrabold` no longer fall back to browser faux-bold.

Cabinet Grotesk has no 600 weight — `font-semibold` on a `.font-display` element interpolates
toward 700; prefer `font-bold` for display headings.
