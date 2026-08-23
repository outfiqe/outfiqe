import "./globals.css";

import { THEME_INIT_SCRIPT } from "@outfiqe/design-system";
import type { Metadata } from "next";
import { headers } from "next/headers";

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

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const nonce = (await headers()).get("x-nonce");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce ?? undefined}
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
