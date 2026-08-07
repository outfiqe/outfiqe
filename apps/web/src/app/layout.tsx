import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

// Server-only — read at request/build time, never shipped to the browser.
// Used for absolute URLs in metadata (OG images, canonical links, sitemap).
const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

// Per-page metadata (see app/login/page.tsx) fills the `%s` in the title
// template. Defaults here are what search engines/social previews get for
// any route that doesn't override them.
//
// TODO: placeholder copy — replace with real marketing/SEO description
// before launch.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Outfiqe",
    template: "%s · Outfiqe",
  },
  description: "Outfiqe — placeholder description, replace before launch.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
