import type { Metadata } from "next";
import { Providers } from "./providers";
import { inter, spaceGrotesk } from "@/design-system/fonts";
import "./globals.css";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

// TODO: placeholder copy — replace with real marketing/SEO description
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
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
