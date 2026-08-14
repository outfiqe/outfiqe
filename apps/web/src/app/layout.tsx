import "./globals.css";

import type { Metadata } from "next";

import { Providers } from "./providers";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

// TODO: placeholder copy — replace with real marketing/SEO description
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Outfiqe",
    template: "%s · Outfiqe",
  },
  description: "Outfiqe — placeholder description, replace before launch.",
  icons: {
    icon: "/logo.svg",
  },
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
